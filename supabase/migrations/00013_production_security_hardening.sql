-- Production security hardening: payments + reviews
-- This migration intentionally disables the demo client-side wallet mint path
-- and moves provider deposits into one atomic, service-role-only RPC.

-- -----------------------------------------------------------------------------
-- 1) Disable direct/demo wallet minting from authenticated clients
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION wallet_deposit(BIGINT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION wallet_deposit(BIGINT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION wallet_deposit(BIGINT, TEXT, TEXT) FROM authenticated;

-- -----------------------------------------------------------------------------
-- 2) Provider deposit ledger with database-enforced idempotency
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_deposits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount           BIGINT NOT NULL CHECK (amount > 0),
  currency         TEXT NOT NULL DEFAULT 'UZS',
  provider         TEXT NOT NULL,
  external_ref     TEXT,
  idempotency_key  TEXT NOT NULL UNIQUE,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_deposits_user_created
  ON payment_deposits (user_id, created_at DESC);

ALTER TABLE payment_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_deposits_select_own" ON payment_deposits;
CREATE POLICY "payment_deposits_select_own"
  ON payment_deposits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON payment_deposits TO authenticated;

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

  -- Fast duplicate check. The UNIQUE constraint below is the final authority.
  SELECT * INTO d
  FROM payment_deposits
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT * INTO w FROM wallets WHERE user_id = d.user_id;
    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'deposit_id', d.id,
      'balance', coalesce(w.balance, 0)
    );
  END IF;

  -- Lock the wallet row so concurrent deposits cannot overwrite each other.
  SELECT * INTO w
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING * INTO w;
  END IF;

  -- Insert idempotency record before balance mutation.
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

  INSERT INTO wallet_ledger (
    wallet_id,
    amount,
    balance_after,
    description
  )
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

-- PostgreSQL functions are executable by PUBLIC by default unless revoked.
REVOKE ALL ON FUNCTION provider_wallet_deposit(UUID, BIGINT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION provider_wallet_deposit(UUID, BIGINT, TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION provider_wallet_deposit(UUID, BIGINT, TEXT, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION provider_wallet_deposit(UUID, BIGINT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- -----------------------------------------------------------------------------
-- 3) Reviews: force writes through submit_task_review()
-- The old direct INSERT policy allowed a signed-in user to self-select any
-- reviewee/context by only setting reviewer_id = auth.uid().
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
REVOKE INSERT ON reviews FROM authenticated;

-- submit_task_review() remains the only authenticated write path and validates:
-- - completed/verified task
-- - actual task participation
-- - correct counterparty as reviewee
-- - rating range
-- - one review per reviewer per task via unique index
