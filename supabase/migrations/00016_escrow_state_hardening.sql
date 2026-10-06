-- Production hardening phase 4:
-- tighten escrow funding/refund rules around the task state machine.

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

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  SELECT * INTO existing
  FROM escrow_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF existing.payer_id <> auth.uid()
       OR existing.micro_task_id IS DISTINCT FROM p_micro_task_id THEN
      RAISE EXCEPTION 'Idempotency key conflict';
    END IF;
    RETURN existing;
  END IF;

  SELECT * INTO task
  FROM micro_tasks
  WHERE id = p_micro_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF task.employer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF task.status <> 'open' THEN
    RAISE EXCEPTION 'Only open tasks can be funded';
  END IF;

  SELECT * INTO existing
  FROM escrow_transactions
  WHERE micro_task_id = p_micro_task_id
    AND status = 'held'
  LIMIT 1;

  IF FOUND THEN
    RETURN existing;
  END IF;

  SELECT * INTO w
  FROM wallets
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND OR w.balance < task.price_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  fee := round(task.price_amount * 0.10);
  new_balance := w.balance - task.price_amount;

  UPDATE wallets
  SET balance = new_balance, updated_at = now()
  WHERE id = w.id;

  INSERT INTO escrow_transactions (
    micro_task_id,
    payer_id,
    amount,
    platform_fee,
    currency,
    status,
    idempotency_key
  )
  VALUES (
    task.id,
    auth.uid(),
    task.price_amount,
    fee,
    task.price_currency,
    'held',
    p_idempotency_key
  )
  RETURNING * INTO result;

  INSERT INTO wallet_ledger (
    wallet_id,
    amount,
    balance_after,
    description,
    escrow_transaction_id
  )
  VALUES (
    w.id,
    -task.price_amount,
    new_balance,
    'Escrow hold: ' || task.title,
    result.id
  );

  RETURN result;
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

  SELECT * INTO task
  FROM micro_tasks
  WHERE id = p_micro_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF task.employer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Once a runner has accepted work, money cannot be unilaterally refunded.
  -- The parties must use dispute/release instead.
  IF task.status <> 'open' THEN
    RAISE EXCEPTION 'Refund is only allowed before task acceptance';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM task_assignments
    WHERE task_id = p_micro_task_id
  ) THEN
    RAISE EXCEPTION 'Assigned task cannot be refunded directly';
  END IF;

  SELECT * INTO esc
  FROM escrow_transactions
  WHERE micro_task_id = p_micro_task_id
    AND status = 'held'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No held escrow for task';
  END IF;

  SELECT * INTO payer_wallet
  FROM wallets
  WHERE user_id = esc.payer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payer wallet not found';
  END IF;

  new_balance := payer_wallet.balance + esc.amount;

  UPDATE wallets
  SET balance = new_balance, updated_at = now()
  WHERE id = payer_wallet.id;

  UPDATE escrow_transactions
  SET status = 'refunded', updated_at = now()
  WHERE id = esc.id
  RETURNING * INTO esc;

  INSERT INTO wallet_ledger (
    wallet_id,
    amount,
    balance_after,
    description,
    escrow_transaction_id
  )
  VALUES (
    payer_wallet.id,
    esc.amount,
    new_balance,
    'Escrow refund: ' || task.title,
    esc.id
  );

  RETURN esc;
END;
$$;
