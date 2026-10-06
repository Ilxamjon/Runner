# Runner

Bilingual (Uzbek / Russian) employment marketplace: Ish Bor–style job board + geolocated micro-tasks, escrow, chat, and ratings.

## Stack

Expo 57 · Supabase (PostgreSQL + PostGIS + Realtime + Storage) · TanStack Query · i18next

## Quick start

```bash
npm install
npx supabase start && npx supabase db reset
cp apps/mobile/.env.example apps/mobile/.env
# EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run mobile
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run mobile` | Expo start |
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

## Modules (status)

| Phase | Status |
|-------|--------|
| 0 Foundation | Done |
| 1 Auth & profiles | Done |
| 2 Job board | Done |
| 3 Runner mode | Done |
| 4 Escrow | Done (demo deposit; gateway stub) |
| 5 Chat / reviews / verification | Done |
| 6 Polish & launch prep | Done |

## Store builds

```bash
cd apps/mobile
npx eas build --profile preview --platform android
```

See [docs/LAUNCH.md](docs/LAUNCH.md).
