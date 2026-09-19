import type {
  EscrowTransaction,
  Wallet,
  WalletLedgerEntry,
} from '@runner/shared';
import { PLATFORM_FEE_PERCENT } from '@runner/shared';
import { supabase } from '@/lib/supabase';

export async function fetchWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Wallet | null;
}

export async function fetchWalletLedger(walletId: string): Promise<WalletLedgerEntry[]> {
  const { data, error } = await supabase
    .from('wallet_ledger')
    .select('*')
    .eq('wallet_id', walletId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as WalletLedgerEntry[];
}

/** Demo top-up — production uses payment webhook Edge Function */
export async function depositToWallet(amount: number, description?: string): Promise<Wallet> {
  const { data, error } = await supabase.rpc('wallet_deposit', {
    p_amount: amount,
    p_description: description ?? 'Demo deposit',
  });

  if (error) throw error;
  return data as Wallet;
}

export async function holdEscrowForTask(
  taskId: string,
  idempotencyKey?: string,
): Promise<EscrowTransaction> {
  const { data, error } = await supabase.rpc('escrow_hold_for_task', {
    p_micro_task_id: taskId,
    p_idempotency_key: idempotencyKey ?? `hold-${taskId}`,
  });

  if (error) throw error;
  return data as EscrowTransaction;
}

export async function releaseEscrowForTask(taskId: string): Promise<EscrowTransaction> {
  const { data, error } = await supabase.rpc('escrow_release_for_task', {
    p_micro_task_id: taskId,
  });

  if (error) throw error;
  return data as EscrowTransaction;
}

export async function refundEscrowForTask(taskId: string): Promise<EscrowTransaction> {
  const { data, error } = await supabase.rpc('escrow_refund_for_task', {
    p_micro_task_id: taskId,
  });

  if (error) throw error;
  return data as EscrowTransaction;
}

export async function disputeEscrowForTask(
  taskId: string,
  reason?: string,
): Promise<EscrowTransaction> {
  const { data, error } = await supabase.rpc('escrow_dispute_for_task', {
    p_micro_task_id: taskId,
    p_reason: reason ?? null,
  });

  if (error) throw error;
  return data as EscrowTransaction;
}

export async function fetchEscrowForTask(taskId: string): Promise<EscrowTransaction | null> {
  const { data, error } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('micro_task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as EscrowTransaction | null;
}

export function calcPlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
}

export function calcNetPayout(amount: number): number {
  return amount - calcPlatformFee(amount);
}

export function isInsufficientBalanceError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('INSUFFICIENT_BALANCE');
}

export const DEMO_DEPOSIT_AMOUNTS = [50_000, 100_000, 500_000, 1_000_000] as const;
