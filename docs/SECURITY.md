# Runner — Security Rules Summary

## Authentication

- Supabase Auth with phone OTP (SMS provider required in production).
- JWT stored in Expo SecureStore (not AsyncStorage).
- Session auto-refresh enabled.

## Row Level Security (RLS)

All public tables have RLS enabled. Key principles:

| Resource | Read | Write |
|----------|------|-------|
| Taxonomy (regions, industries) | Public | Admin only (service role) |
| Profiles | Active users | Own profile only |
| Vacancies | Published + own drafts | Employer owns listing |
| Applications | Candidate + vacancy employer | Candidate creates; both update status |
| Micro-tasks | Open tasks + parties involved | Employer creates; parties update |
| Task assignments | Runner + employer | Runner accepts open tasks |
| Wallets / escrow | Own records | **Edge Functions only** (service role) |
| Messages | Conversation participants | Participants send |
| Reviews | Public read | Reviewer creates (once per context) |
| Verifications | Own records | User submits |

## Storage Security

| Bucket | Public Read | Upload | MIME Types |
|--------|-------------|--------|------------|
| `avatars` | Yes | Own folder `{user_id}/*` | image/jpeg, png, webp |
| `job-images` | Yes | Own folder `{user_id}/*` | image/jpeg, png, webp |
| `task-images` | Yes | Own folder `{user_id}/*` | image/jpeg, png, webp |
| `verification-docs` | No | Own folder `{user_id}/*` | image/jpeg, png, webp |

**No video MIME types are permitted.** File size limits enforced at bucket level (2–10 MB).

## Escrow Security

- Client cannot directly mutate `escrow_transactions` or `wallet_ledger`.
- All financial state changes go through Edge Functions with:
  - JWT validation
  - Idempotency keys
  - Ownership checks (payer = task employer)
- Payment webhooks verified with provider signature.

## Realtime Channels

- Subscribe to `micro_tasks` for map updates (filtered by bbox in client).
- Subscribe to `messages` per conversation (participant check via RLS).
- Never expose service role key in mobile app.

## Client Checklist

- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` only (never service role)
- [ ] Image picker restricted to `mediaTypes: ['images']`
- [ ] Location permission requested only when needed (Runner tab)
- [ ] Rate limiting on task creation (Edge Function, Phase 4)

See `supabase/migrations/00002_rls_policies.sql` and `00003_storage_policies.sql` for full policy definitions.
