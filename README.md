# Runner

Bilingual (Uzbek / Russian) employment marketplace: Ish Bor–style job board + geolocated micro-tasks, escrow, chat, and ratings.

## Stack

Expo SDK 56 (see `apps/mobile/package.json`) · Supabase (PostgreSQL + PostGIS + Realtime + Storage) · TanStack Query · i18next

> Before a public release, schedule and validate an Expo SDK 57 upgrade. Do not change SDK versions without running Expo Doctor, type checks, Android/iOS builds, and device QA.

## Quick start

```bash
npm ci
npx supabase start && npx supabase db reset
cp apps/mobile/.env.example apps/mobile/.env
# EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run mobile
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run mobile` | Expo development server |
| `npm run typecheck` | TypeScript check |
| `npm run db:reset` | Apply all migrations + seed |
| `npm run load:smoke` | REST load smoke test |

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Security](docs/SECURITY.md)
- [Escrow](docs/ESCROW.md)
- [Trust](docs/TRUST.md)
- [Admin KPI](docs/ADMIN.md)
- [Launch checklist](docs/LAUNCH.md)
- [Staging setup](docs/STAGING.md)
- [Roadmap](docs/ROADMAP.md)
- [Production audit findings](docs/PRODUCTION_AUDIT.md)

## Module status

The modules below are implemented as development features; this is not a claim of production readiness.

| Area | Status |
|-------|--------|
| Authentication and profiles | Implemented; production SMS provider still required |
| Job board and applications | Implemented; requires staging end-to-end QA |
| Runner micro-tasks | Implemented; requires concurrency/security regression tests |
| Wallet and escrow | Database hardening in progress; real payment providers are not production-ready |
| Chat, reviews and verification | Implemented; requires multi-user/device QA |
| Launch and operations | Not complete; see `docs/LAUNCH.md` |

## Store builds

```bash
cd apps/mobile
npx eas build --profile preview --platform android
```

See [docs/LAUNCH.md](docs/LAUNCH.md). Never include a Supabase service-role key in the mobile app or commit real `.env` files.
