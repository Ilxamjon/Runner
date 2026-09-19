-- Escrow & wallet operations (service-side via SECURITY DEFINER RPCs)
-- Client cannot mutate wallets/escrow directly (RLS); only these functions.

CREATE OR REPLACE FUNCTION wallet_deposit(
  p_amount BIGINT,
  p_description TEXT DEFAULT 'Hamyon to''ldirish',
  p_external_ref TEXT DEFAULT NULL
)
RETURNS wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w wallets;
  new_balance BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT * INTO w FROM wallets WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance) VALUES (auth.uid(), 0)
    RETURNING * INTO w;
  END IF;

  new_balance := w.balance + p_amount;
  UPDATE wallets SET balance = new_balance, updated_at = now()
  WHERE id = w.id
  RETURNING * INTO w;

  INSERT INTO wallet_ledger (wallet_id, amount, balance_after, description)
  VALUES (w.id, p_amount, new_balance, coalesce(p_description, 'Deposit'));

  RETURN w;
END;
$$;

CREATE OR REPLACE FUNCTION escrow_hold_for_task(
  p_micro_task_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS escrow_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task micro_tasks;
  w wallets;
  fee BIGINT;
  existing escrow_transactions;
  result escrow_transactions;
  new_balance BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO existing FROM escrow_transactions WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN existing;
    END IF;
  END IF;

  SELECT * INTO task FROM micro_tasks WHERE id = p_micro_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF task.employer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF task.status NOT IN ('open', 'accepted') THEN
    RAISE EXCEPTION 'Task cannot be funded in status %', task.status;
  END IF;

  -- Already held?
  SELECT * INTO existing
  FROM escrow_transactions
  WHERE micro_task_id = p_micro_task_id AND status = 'held'
  LIMIT 1;
  IF FOUND THEN
    RETURN existing;
  END IF;

  SELECT * INTO w FROM wallets WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR w.balance < task.price_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  fee := round(task.price_amount * 0.10);
  new_balance := w.balance - task.price_amount;

  UPDATE wallets SET balance = new_balance, updated_at = now() WHERE id = w.id;

  INSERT INTO escrow_transactions (
    micro_task_id, payer_id, amount, platform_fee, currency, status, idempotency_key
  ) VALUES (
    task.id, auth.uid(), task.price_amount, fee, task.price_currency, 'held', p_idempotency_key
  )
  RETURNING * INTO result;

  INSERT INTO wallet_ledger (wallet_id, amount, balance_after, description, escrow_transaction_id)
  VALUES (w.id, -task.price_amount, new_balance, 'Escrow hold: ' || task.title, result.id);

  RETURN result;
END;
$$;

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
  payer_wallet wallets;
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

  -- Mark task verified if still completed
  IF task.status = 'completed' THEN
    UPDATE micro_tasks
    SET status = 'verified', verified_at = now(), updated_at = now()
    WHERE id = task.id;
  END IF;

  RETURN esc;
END;
$$;

CREATE OR REPLACE FUNCTION escrow_refund_for_task(p_micro_task_id UUID)
RETURNS escrow_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task micro_tasks;
  esc escrow_transactions;
  payer_wallet wallets;
  new_balance BIGINT;
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

  SELECT * INTO esc
  FROM escrow_transactions
  WHERE micro_task_id = p_micro_task_id AND status = 'held'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No held escrow for task';
  END IF;

  SELECT * INTO payer_wallet FROM wallets WHERE user_id = esc.payer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payer wallet not found';
  END IF;

  new_balance := payer_wallet.balance + esc.amount;
  UPDATE wallets SET balance = new_balance, updated_at = now() WHERE id = payer_wallet.id;

  UPDATE escrow_transactions
  SET status = 'refunded', updated_at = now()
  WHERE id = esc.id
  RETURNING * INTO esc;

  INSERT INTO wallet_ledger (wallet_id, amount, balance_after, description, escrow_transaction_id)
  VALUES (payer_wallet.id, esc.amount, new_balance, 'Escrow refund: ' || task.title, esc.id);

  RETURN esc;
END;
$$;

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

GRANT EXECUTE ON FUNCTION wallet_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION escrow_hold_for_task TO authenticated;
GRANT EXECUTE ON FUNCTION escrow_release_for_task TO authenticated;
GRANT EXECUTE ON FUNCTION escrow_refund_for_task TO authenticated;
GRANT EXECUTE ON FUNCTION escrow_dispute_for_task TO authenticated;
