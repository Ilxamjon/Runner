# Escrow & Payments

## Flow

```
Employer deposits wallet → creates task → escrow_hold (wallet debit)
  → Runner accepts → works → completes
  → Employer verifies → escrow_release (runner credit − 10% fee)
  OR cancel (open) → escrow_refund
  OR dispute → escrow_disputed (manual review)
```

## SQL RPCs (SECURITY DEFINER)

| Function | Who | Effect |
|----------|-----|--------|
| `wallet_deposit` | Authenticated user | Credit own wallet (demo top-up) |
| `escrow_hold_for_task` | Task employer | Debit wallet, create `held` escrow |
| `escrow_release_for_task` | Task employer | Credit runner (net), mark `released` + task `verified` |
| `escrow_refund_for_task` | Task employer | Return funds, mark `refunded` |
| `escrow_dispute_for_task` | Employer or assigned runner | Mark escrow + task `disputed` |

## Edge Functions

- `create-escrow` — wraps `escrow_hold_for_task`
- `release-escrow` — wraps `escrow_release_for_task`
- `process-payment-webhook` — Click/Payme/Uzum stub (signature check + deposit)

## Platform fee

`PLATFORM_FEE_PERCENT = 10` in `@runner/shared`.

## Mobile

- `/profile/wallet` — balance, demo deposit, ledger
- Task create — requires sufficient balance, auto-hold
- Task detail — escrow status, release / refund / dispute
