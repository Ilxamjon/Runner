-- 00017: Security follow-ups to the production hardening branch.
--
-- 0) Pin search_path on pre-existing SECURITY DEFINER functions.
-- 1) Fix self-referencing RLS policy on conversation_participants
--    (a policy that queries its own table raises "infinite recursion").
-- 2) Force safe initial state for client-inserted applications / micro_tasks.
-- 3) provider_wallet_deposit: a replayed idempotency key must match the
--    original deposit (user, amount, provider).
-- 4) sync_verified_phone: only trust a CONFIRMED phone.
-- 5) escrow_dispute_for_task: only for funded, in-flight tasks.
-- 6) platform_fee_ledger so platform fees reconcile with wallet balances.
-- 7) escrow_resolve_dispute: admin-only way out of the 'disputed' state.

-- -----------------------------------------------------------------------------
-- 0) search_path pinning
-- -----------------------------------------------------------------------------
ALTER FUNCTION has_role(user_role) SET search_path = public;
ALTER FUNCTION handle_new_user() SET search_path = public;

-- -----------------------------------------------------------------------------
-- 1) conversation_participants: avoid recursive policy
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION is_conversation_participant(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_conversation_participant(UUID) TO authenticated;

DROP POLICY IF EXISTS "conversation_participants_select_peers" ON conversation_participants;
CREATE POLICY "conversation_participants_select_peers" ON conversation_participants
  FOR SELECT TO authenticated
  USING (is_conversation_participant(conversation_id));

-- -----------------------------------------------------------------------------
-- 2) Initial state of client-inserted rows
--    RLS only checks ownership, so a client could insert an application with
--    status 'hired' or a task already 'completed'. Force the initial state.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION force_application_initial_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status := 'submitted';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_applications_initial_state ON applications;
CREATE TRIGGER tr_applications_initial_state
  BEFORE INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION force_application_initial_state();

CREATE OR REPLACE FUNCTION force_micro_task_initial_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status := 'open';
  NEW.accepted_at := NULL;
  NEW.completed_at := NULL;
  NEW.verified_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_micro_tasks_initial_state ON micro_tasks;
CREATE TRIGGER tr_micro_tasks_initial_state
  BEFORE INSERT ON micro_tasks
  FOR EACH ROW EXECUTE FUNCTION force_micro_task_initial_state();

-- -----------------------------------------------------------------------------
-- 3) provider_wallet_deposit: idempotency replay must match original
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION provider_wallet_deposit(
  p_user_id UUID,
  p_amount BIGINT,
  p_provider TEXT,
  p_external_ref TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w wallets;
  d payment_deposits;
  new_balance BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF p_provider IS NULL OR length(trim(p_provider)) = 0 THEN
    RAISE EXCEPTION 'provider is required';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'idempotency_key is required';
  END IF;

  SELECT * INTO d
  FROM payment_deposits
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF d.user_id <> p_user_id
       OR d.amount <> p_amount
       OR d.provider <> trim(p_provider) THEN
      RAISE EXCEPTION 'Idempotency key conflict';
    END IF;

    SELECT * INTO w FROM wallets WHERE user_id = d.user_id;
    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'deposit_id', d.id,
      'balance', coalesce(w.balance, 0)
    );
  END IF;

  SELECT * INTO w
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING * INTO w;
  END IF;

  BEGIN
    INSERT INTO payment_deposits (
      user_id, amount, provider, external_ref, idempotency_key, metadata
    )
    VALUES (
      p_user_id,
      p_amount,
      trim(p_provider),
      p_external_ref,
      p_idempotency_key,
      coalesce(p_metadata, '{}'::jsonb)
    )
    RETURNING * INTO d;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO d
      FROM payment_deposits
      WHERE idempotency_key = p_idempotency_key;

      IF d.user_id <> p_user_id
         OR d.amount <> p_amount
         OR d.provider <> trim(p_provider) THEN
        RAISE EXCEPTION 'Idempotency key conflict';
      END IF;

      SELECT * INTO w FROM wallets WHERE user_id = d.user_id;

      RETURN jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'deposit_id', d.id,
        'balance', coalesce(w.balance, 0)
      );
  END;

  new_balance := w.balance + p_amount;

  UPDATE wallets
  SET balance = new_balance, updated_at = now()
  WHERE id = w.id;

  INSERT INTO wallet_ledger (wallet_id, amount, balance_after, description)
  VALUES (
    w.id,
    p_amount,
    new_balance,
    'Deposit via ' || trim(p_provider) ||
      CASE
        WHEN p_external_ref IS NOT NULL AND length(trim(p_external_ref)) > 0
        THEN ' (' || trim(p_external_ref) || ')'
        ELSE ''
      END
  );

  RETURN jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'deposit_id', d.id,
    'balance', new_balance
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4) sync_verified_phone: require a confirmed phone
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_verified_phone()
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  verified_phone TEXT;
  result public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT phone INTO verified_phone
  FROM auth.users
  WHERE id = auth.uid()
    AND phone_confirmed_at IS NOT NULL;

  IF verified_phone IS NULL OR length(trim(verified_phone)) = 0 THEN
    RAISE EXCEPTION 'No verified phone on auth user';
  END IF;

  UPDATE public.profiles
  SET phone = verified_phone,
      phone_verified = true,
      updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5) escrow_dispute_for_task: only for accepted / in-progress / completed work
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION escrow_dispute_for_task(p_micro_task_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS escrow_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task micro_tasks;
  esc escrow_transactions;
  assignment task_assignments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO task FROM micro_tasks WHERE id = p_micro_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  SELECT * INTO assignment FROM task_assignments WHERE task_id = p_micro_task_id;

  IF task.employer_id <> auth.uid()
     AND (assignment.runner_id IS NULL OR assignment.runner_id <> auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF task.status NOT IN ('accepted', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Dispute is only allowed for accepted, in-progress or completed tasks';
  END IF;

  SELECT * INTO esc
  FROM escrow_transactions
  WHERE micro_task_id = p_micro_task_id AND status = 'held'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No held escrow for task';
  END IF;

  UPDATE escrow_transactions
  SET
    status = 'disputed',
    metadata = metadata || jsonb_build_object(
      'dispute_reason', coalesce(p_reason, ''),
      'disputed_by', auth.uid()::text,
      'disputed_at', now()
    ),
    updated_at = now()
  WHERE id = esc.id
  RETURNING * INTO esc;

  UPDATE micro_tasks SET status = 'disputed', updated_at = now() WHERE id = task.id;

  RETURN esc;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Platform fee ledger (fees previously vanished from the books)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_fee_ledger (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_transaction_id UUID NOT NULL UNIQUE REFERENCES escrow_transactions(id) ON DELETE RESTRICT,
  amount                BIGINT NOT NULL CHECK (amount >= 0),
  currency              TEXT NOT NULL DEFAULT 'UZS',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_fee_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON platform_fee_ledger FROM PUBLIC, anon, authenticated;

-- Backfill fees for escrows that were already released.
INSERT INTO platform_fee_ledger (escrow_transaction_id, amount, currency)
SELECT id, platform_fee, currency
FROM escrow_transactions
WHERE status = 'released'
ON CONFLICT (escrow_transaction_id) DO NOTHING;

CREATE OR REPLACE FUNCTION escrow_release_for_task(p_micro_task_id UUID)
RETURNS escrow_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task micro_tasks;
  esc escrow_transactions;
  assignment task_assignments;
  payee_wallet wallets;
  net_amount BIGINT;
  new_payee_balance BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO task FROM micro_tasks WHERE id = p_micro_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF task.employer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF task.status NOT IN ('completed', 'verified') THEN
    RAISE EXCEPTION 'Task must be completed before release';
  END IF;

  SELECT * INTO esc
  FROM escrow_transactions
  WHERE micro_task_id = p_micro_task_id AND status = 'held'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No held escrow for task';
  END IF;

  SELECT * INTO assignment FROM task_assignments WHERE task_id = p_micro_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No runner assigned';
  END IF;

  net_amount := esc.amount - esc.platform_fee;

  SELECT * INTO payee_wallet FROM wallets WHERE user_id = assignment.runner_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance) VALUES (assignment.runner_id, 0)
    RETURNING * INTO payee_wallet;
  END IF;

  new_payee_balance := payee_wallet.balance + net_amount;
  UPDATE wallets SET balance = new_payee_balance, updated_at = now()
  WHERE id = payee_wallet.id;

  UPDATE escrow_transactions
  SET status = 'released', payee_id = assignment.runner_id, updated_at = now()
  WHERE id = esc.id
  RETURNING * INTO esc;

  INSERT INTO wallet_ledger (wallet_id, amount, balance_after, description, escrow_transaction_id)
  VALUES (
    payee_wallet.id,
    net_amount,
    new_payee_balance,
    'Escrow release: ' || task.title,
    esc.id
  );

  INSERT INTO platform_fee_ledger (escrow_transaction_id, amount, currency)
  VALUES (esc.id, esc.platform_fee, esc.currency)
  ON CONFLICT (escrow_transaction_id) DO NOTHING;

  IF task.status = 'completed' THEN
    UPDATE micro_tasks
    SET status = 'verified', verified_at = now(), updated_at = now()
    WHERE id = task.id;
  END IF;

  RETURN esc;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7) Admin dispute resolution: release to runner or refund to employer
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION escrow_resolve_dispute(
  p_micro_task_id UUID,
  p_resolution TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS escrow_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task micro_tasks;
  esc escrow_transactions;
  assignment task_assignments;
  payer_wallet wallets;
  payee_wallet wallets;
  net_amount BIGINT;
  new_balance BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_role('admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF p_resolution IS NULL OR p_resolution NOT IN ('release', 'refund') THEN
    RAISE EXCEPTION 'Resolution must be release or refund';
  END IF;

  SELECT * INTO task FROM micro_tasks WHERE id = p_micro_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  SELECT * INTO esc
  FROM escrow_transactions
  WHERE micro_task_id = p_micro_task_id AND status = 'disputed'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No disputed escrow for task';
  END IF;

  IF p_resolution = 'release' THEN
    SELECT * INTO assignment FROM task_assignments WHERE task_id = p_micro_task_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No runner assigned';
    END IF;

    net_amount := esc.amount - esc.platform_fee;

    SELECT * INTO payee_wallet FROM wallets WHERE user_id = assignment.runner_id FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO wallets (user_id, balance) VALUES (assignment.runner_id, 0)
      RETURNING * INTO payee_wallet;
    END IF;

    new_balance := payee_wallet.balance + net_amount;
    UPDATE wallets SET balance = new_balance, updated_at = now()
    WHERE id = payee_wallet.id;

    UPDATE escrow_transactions
    SET
      status = 'released',
      payee_id = assignment.runner_id,
      metadata = metadata || jsonb_build_object(
        'resolution', 'release',
        'resolution_note', coalesce(p_note, ''),
        'resolved_by', auth.uid()::text,
        'resolved_at', now()
      ),
      updated_at = now()
    WHERE id = esc.id
    RETURNING * INTO esc;

    INSERT INTO wallet_ledger (wallet_id, amount, balance_after, description, escrow_transaction_id)
    VALUES (
      payee_wallet.id,
      net_amount,
      new_balance,
      'Dispute resolved (release): ' || task.title,
      esc.id
    );

    INSERT INTO platform_fee_ledger (escrow_transaction_id, amount, currency)
    VALUES (esc.id, esc.platform_fee, esc.currency)
    ON CONFLICT (escrow_transaction_id) DO NOTHING;

    UPDATE micro_tasks
    SET status = 'verified', verified_at = now(), updated_at = now()
    WHERE id = task.id;
  ELSE
    SELECT * INTO payer_wallet FROM wallets WHERE user_id = esc.payer_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payer wallet not found';
    END IF;

    new_balance := payer_wallet.balance + esc.amount;
    UPDATE wallets SET balance = new_balance, updated_at = now()
    WHERE id = payer_wallet.id;

    UPDATE escrow_transactions
    SET
      status = 'refunded',
      metadata = metadata || jsonb_build_object(
        'resolution', 'refund',
        'resolution_note', coalesce(p_note, ''),
        'resolved_by', auth.uid()::text,
        'resolved_at', now()
      ),
      updated_at = now()
    WHERE id = esc.id
    RETURNING * INTO esc;

    INSERT INTO wallet_ledger (wallet_id, amount, balance_after, description, escrow_transaction_id)
    VALUES (
      payer_wallet.id,
      esc.amount,
      new_balance,
      'Dispute resolved (refund): ' || task.title,
      esc.id
    );

    UPDATE micro_tasks
    SET status = 'cancelled', updated_at = now()
    WHERE id = task.id;
  END IF;

  RETURN esc;
END;
$$;

REVOKE ALL ON FUNCTION escrow_resolve_dispute(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION escrow_resolve_dispute(UUID, TEXT, TEXT) TO authenticated;
