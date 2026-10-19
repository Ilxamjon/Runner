# Launch Checklist — Runner

> Do not launch publicly or accept real payments until every security, provider integration and QA blocker below is resolved.

## Pre-production infrastructure

- [ ] Separate Supabase **staging** and **production** projects created.
- [ ] All migrations applied and verified with `supabase db push`.
- [ ] Production SMS provider (for example, Eskiz or Twilio) configured and OTP tested.
- [ ] Storage buckets, MIME restrictions and object access policies verified in the deployed project.
- [ ] Edge Functions deployed: `create-escrow`, `release-escrow`, `process-payment-webhook`.
- [ ] Mobile environment contains only the public/anon key; service-role key remains server-side.
- [ ] RLS negative tests prove one user cannot read or modify another user's private data.

## Payments — mandatory blocker

- [ ] Implement the official Click callback protocol and signature/credential verification.
- [ ] Implement the official Payme Merchant API protocol, signature verification and transaction lifecycle.
- [ ] Implement the official Uzum protocol if Uzum will be offered.
- [ ] Verify order ownership, amount, currency, payment state, idempotency and replay/reversal handling.
- [ ] Add tests for forged, duplicated, expired, mismatched and out-of-order callbacks.
- [ ] Run end-to-end tests using each provider's sandbox.
- [ ] Keep real payment processing disabled until the above checks pass.

The current webhook supports only explicitly enabled non-production test mode. A shared-secret adapter is not production payment integration.

## Mobile build

```bash
cd apps/mobile
npx eas login
npx eas build:configure
npx eas build --platform android --profile staging
```

- [ ] EAS project ID configured in the build environment.
- [ ] Android package and iOS bundle identifiers checked for staging/production separation.
- [ ] Store icons, splash screen and screenshots prepared (Uzbek/Russian).
- [ ] Privacy Policy and Terms URLs published.
- [ ] Test installable build on real Android devices; run iOS QA if shipping iOS.

## End-to-end QA

- [ ] Phone OTP sign-in, sign-out and session expiry.
- [ ] Onboarding and role permissions.
- [ ] Vacancy creation, application, status transitions and withdrawal.
- [ ] Micro-task creation, concurrent accept attempts and cancellation.
- [ ] Escrow hold/release/refund/dispute with test balances.
- [ ] Chat access isolation and realtime updates.
- [ ] Reviews, verification workflow and Uzbek/Russian switching.
- [ ] Empty/error/loading/offline states and accessibility.
- [ ] Load smoke test and database query performance.

## Dependency and release gates

- [ ] Resolve all high/critical production dependency advisories reported by `npm audit --omit=dev`.
- [ ] CI TypeScript and migration jobs pass.
- [ ] Security regression tests pass.
- [ ] Crash monitoring and operational alerting configured.
- [ ] Backup/restore procedure tested.

## Post-launch

- [ ] Crash monitoring (for example, Sentry).
- [ ] Analytics provider configured with privacy review.
- [ ] Push notifications (application/chat) implemented and tested.
- [ ] Incident response and support contact documented.
