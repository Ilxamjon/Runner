# Runner

Bilingual (Uzbek / Russian) employment marketplace: job board + geolocated micro-tasks, chat, and ratings. Startup strategy: validate the service in Nukus before expanding across Qoraqalpog‘iston.

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

The **Build Runner Demo APK** workflow can build a standalone demo without a Supabase project or SMS login. It uses local sample data only: applications, tasks and messages are not sent to a server and no real payments are processed.

Open the repository's Actions tab and download the `runner-demo-apk` artifact only from a successful workflow run. A workflow definition alone does not prove that a build has succeeded.

## Startup plan

- [Nukus-first startup validation plan](docs/STARTUP_PLAN.md)
- [Nukus pilot checklist](docs/PILOT_CHECKLIST.md)
- [Customer interview guide and outreach scripts](docs/INTERVIEW_GUIDE.md)
- [Launch readiness checklist](docs/LAUNCH.md)
- [Staging setup](docs/STAGING.md)
- [Production audit findings](docs/PRODUCTION_AUDIT.md)
- [Roadmap](docs/ROADMAP.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run mobile` | Start Expo |
| `npm run typecheck` | TypeScript check across workspaces |
| `npm run db:reset` | Reset database, apply migrations and seed data |
| `npm run load:smoke` | REST load smoke test |
| `npm run ci` | Run TypeScript checks |

## Production readiness

This repository is a development product and is **not yet production-ready**. Authentication, jobs, micro-tasks, chat and profiles require staging end-to-end QA. The inspected CI run passed TypeScript and migration checks but failed the production dependency audit. Official Click/Payme/Uzum integrations, RLS/security regression tests, and real-device QA remain release gates. Keep real deposits and escrow disabled until official provider protocols and the required tests are complete.

## Staging build

```bash
cd apps/mobile
npx eas login
npx eas build:configure
npx eas build --platform android --profile staging
```

Never include a Supabase service-role key in the mobile app or commit real `.env` files.