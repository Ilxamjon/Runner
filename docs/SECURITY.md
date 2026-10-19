# Runner — Security Rules Summary

## Authentication

- Supabase Auth with phone OTP (a production SMS provider must be configured).
- JWT stored in Expo SecureStore, not AsyncStorage.
- Session auto-refresh enabled.

## Row Level Security (RLS)

All public tables should have RLS enabled. Verify the actual policies in migrations and staging tests before production.

| Resource | Intended read access | Intended write access |
|----------|----------------------|-----------------------|
| Taxonomy (regions, industries) | Public | Admin/service role only |
| Profiles | Active users | Own profile only; protected fields server-controlled |
| Vacancies | Published listings + own drafts | Employer owns listing |
| Applications | Candidate + vacancy employer | State transitions through validated database functions |
| Micro-tasks | Open tasks + parties involved | Employer creates; workflow functions validate transitions |
| Task assignments | Runner + employer | Atomic accept/transition functions |
| Wallets / escrow | Own records | Server/database functions only |
| Messages | Conversation participants | Participants send |
| Reviews | Public read | Eligible reviewer, once per context |
| Verifications | Own records | User submits; approval fields server-controlled |

## Storage Security

| Bucket | Public read | Upload policy |
|--------|-------------|---------------|
| `avatars` | Yes | Own folder `{user_id}/*` |
| `job-images` | Yes | Own folder `{user_id}/*` |
| `task-images` | Yes | Own folder `{user_id}/*` |
| `verification-docs` | No | Own folder `{user_id}/*` |

Confirm MIME type and size restrictions in the deployed Supabase project, not only in source migrations.

## Payments and escrow — production blocker

- Client must not directly mutate `escrow_transactions` or `wallet_ledger`.
- Financial operations must use atomic database functions with ownership checks and idempotency.
- **Real Click, Payme and Uzum deposits are not production-ready.** The current webhook deliberately rejects all requests unless explicit non-production test mode is enabled.
- A shared secret header is not a replacement for each provider's official callback authentication, transaction lifecycle, amount/order validation, replay protection and refund/reversal handling.
- Do not set `PAYMENT_WEBHOOK_MODE=test` in production. Do not accept real money until native provider adapters and security regression tests are implemented.

## Client checklist

- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` only; never bundle the service-role key.
- [ ] Image picker restricted to images.
- [ ] Location permission requested only when needed.
- [ ] Rate limiting and abuse controls tested on task creation and messaging.
- [ ] RLS negative tests cover cross-user reads/writes and protected profile fields.
- [ ] Payment, escrow and status-transition regression tests pass.

See `supabase/migrations/00002_rls_policies.sql` and `00003_storage_policies.sql`. A passing typecheck or migration reset is not a substitute for authorization tests against a staging project.
