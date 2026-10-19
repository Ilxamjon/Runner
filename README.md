# Runner

Bilingual (Uzbek / Russian) employment marketplace: job board + geolocated micro-tasks, escrow, chat, and ratings.

## Stack

Expo SDK 57 · Supabase (PostgreSQL + PostGIS + Realtime + Storage) · TanStack Query · i18next

## Quick start

```bash
npm ci
npx supabase start
npx supabase db reset
cp apps/mobile/.env.example apps/mobile/.env
# Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env
npm run mobile
```

## Demo APK (offline prototype)

A separate demo build is available through the GitHub Actions workflow **Build Runner Demo APK**. It does not require a Supabase project or SMS login. The demo uses local sample data only; applications, tasks and messages are not sent to a server and no real payments are processed.

See the workflow runs in the repository's Actions tab and download the `runner-demo-apk` artifact after a successful run.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run mobile` | Start Expo |
| `npm run typecheck` | TypeScript check across workspaces |
| `npm run db:reset` | Reset database, apply migrations and seed data |
| `npm run load:smoke` | REST load smoke test |
| `npm run ci` | Run TypeScript checks |

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

## Production readiness

Authentication, jobs, micro-tasks, chat and profiles have development implementations, but require staging end-to-end QA. Real Click/Payme/Uzum payment integrations are not production-ready; keep real deposits disabled until official provider protocols and security tests are complete.

## Staging build

```bash
cd apps/mobile
npx eas build --profile staging --platform android
```

Never include a Supabase service-role key in the mobile app or commit real `.env` files.
