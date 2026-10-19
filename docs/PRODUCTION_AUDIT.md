# Runner — Production Audit Findings

Audit date: 2026-10-19

## Current decision

**Not production-ready yet.** The hardening branch reduces risk and makes the payment webhook fail closed, but production release must remain blocked until dependency vulnerabilities, provider integrations and end-to-end security tests are resolved.

## Verified checks

- GitHub Actions typecheck job was added; the latest run is still running at the time of this audit.
- Supabase migration-reset CI job is enabled; the latest run is still running at the time of this audit.
- Dependency audit is enabled as a blocking CI gate for high/critical production advisories.
- The audit gate failed on the first run after being made blocking. The log reported **32 advisories in the dependency tree: 10 moderate, 21 high and 1 critical**. The critical advisory was `shell-quote` (GHSA-pqg4-j6r4-53mv); high advisories included `image-size` and `node-forge`. The audit output also showed fixes that would require breaking dependency changes for some transitive packages.
- Do not use `npm audit fix --force` blindly: the audit output explicitly indicated potential breaking Expo/Expo Router changes.

## Changes made on `security/production-hardening-phase1`

- Removed the ignore rule that excluded `.github/workflows/`, so CI workflows can be tracked normally.
- Made `npm audit --omit=dev --audit-level=high` a blocking check rather than reporting findings and continuing.
- Corrected the README's Expo SDK description to match `apps/mobile/package.json` (Expo SDK 56).
- Hardened `process-payment-webhook`: it is disabled by default and rejects requests unless explicit non-production test mode is configured; it rejects production mode and non-test provider names, validates UUID/amount/idempotency key and limits payload values.
- Updated security and launch documentation so the shared-secret adapter cannot be mistaken for real Click/Payme/Uzum production integration.

## Mandatory remaining work

1. Resolve the production dependency advisories using compatible package/lockfile updates; rerun `npm ci`, `npm audit --omit=dev --audit-level=high`, TypeScript checks, Expo Doctor and Android build.
2. Implement the official Click, Payme and (if offered) Uzum callback protocols, including provider-native authentication/signatures, transaction state lifecycle, amount/order matching, idempotency, duplicate callbacks, reversal/refund handling and sandbox tests. Keep real deposits disabled until then.
3. Add database security regression tests for RLS, role/identity fields, cross-user data access, concurrent task acceptance and escrow state transitions.
4. Complete real-device staging QA for OTP, onboarding, job applications, micro-tasks, chat, reviews, language switching, error states and app permissions.
5. Configure production Supabase/EAS environments, SMS provider, privacy policy/terms, crash monitoring, backups and operational alerts.

## Why this is not marked complete

A successful typecheck or migration reset does not prove that authorization policies, financial flows, or mobile runtime behavior are secure. The current dependency audit is failing and live payment providers are intentionally disabled, so public launch and accepting real money are not safe yet.
