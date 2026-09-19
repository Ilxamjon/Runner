# Runner — Development Roadmap

## Phase 0 — Foundation
- [x] Monorepo structure
- [x] Architecture documentation
- [x] PostgreSQL schema + RLS migrations
- [x] Shared types and i18n (uz/ru)
- [x] Expo mobile scaffold with navigation shell
- [x] CI pipeline (typecheck)
- [ ] Supabase project provisioning (staging/prod) — deploy-time

## Phase 1 — Auth & Profiles
- [x] Phone OTP authentication
- [x] Profile creation wizard (role selection)
- [x] Candidate digital resume CRUD
- [x] Employer business profile
- [x] Runner availability toggle

## Phase 2 — Job Board
- [x] Industry/region taxonomy seed data
- [x] Vacancy CRUD + image uploads
- [x] Advanced search and filters
- [x] Application flow + employer applicant pool
- [ ] Push notifications for application updates (FCM)

## Phase 3 — Runner Mode
- [x] Map UI with nearby open tasks
- [x] Real-time task markers (Realtime)
- [x] Task creation flow with geolocation
- [x] Accept / complete / verify workflow
- [x] Runner location tracking (active tasks)

## Phase 4 — Escrow & Payments
- [x] Wallet balances
- [x] Escrow hold on task creation / funding
- [x] Payment gateway stub (Click/Payme webhook Edge Function)
- [x] Release on verification
- [x] Dispute flow
- [ ] Production Click/Payme/Uzum credentials (deploy-time)

## Phase 5 — Trust & Communication
- [x] In-app chat (Realtime)
- [x] Double-sided reviews
- [x] Identity verification upload
- [x] Rating aggregation on profiles
- [ ] Push notifications for new messages (FCM)

## Phase 6 — Polish & Launch
- [x] Performance indexes + admin KPI views
- [x] EAS build / submit config
- [x] Error boundary + analytics stub
- [x] CI (GitHub Actions)
- [x] Load smoke script
- [x] Launch checklist
- [ ] Store screenshots & privacy policy URLs
- [ ] Production EAS projectId / Apple / Google credentials

## Success Metrics
- Task match time < 5 minutes (Runner mode)
- Job application completion rate > 60%
- Escrow dispute rate < 2%
- App crash-free sessions > 99.5%
