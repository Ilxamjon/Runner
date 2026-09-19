# Runner — System Architecture

## Overview

Runner is a bilingual (Uzbek / Russian) employment marketplace combining:

1. **Job Board** — Ish Bor–style permanent and temporary vacancies with employer dashboards and candidate profiles.
2. **Runner Mode** — Geolocated micro-tasks with real-time map UI, instant booking, and on-demand completion.
3. **Trust Layer** — Escrow payments, identity verification, in-app chat, and double-sided ratings.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Client Layer (Expo / RN)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Job Board│ │ Runner   │ │ Profile  │ │ Chat     │ │ Payments UI  │  │
│  │ Module   │ │ Map Mode │ │ /Resume  │ │ Module   │ │ / Escrow     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
│       └────────────┴────────────┴────────────┴───────────────┘          │
│                              │                                           │
│                    packages/shared (types, i18n, constants)              │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────┼──────────────────────────────────────────┐
│                    Supabase Platform                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │ Auth        │  │ PostgreSQL   │  │ Realtime    │  │ Storage        │ │
│  │ (JWT/OTP)   │  │ + PostGIS    │  │ (tasks,     │  │ (images only)  │ │
│  │             │  │ + RLS        │  │  chat)      │  │                │ │
│  └─────────────┘  └──────────────┘  └─────────────┘  └────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Edge Functions: escrow webhooks, payment capture, push notifications │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                    External Services                                     │
│  Payment Gateway (Click/Payme/Uzum) │ SMS OTP │ Push (FCM/APNs) │ Maps  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Mobile | **Expo (React Native)** | Cross-platform, fast iteration, native maps/camera, OTA updates |
| Backend | **Supabase** | PostgreSQL + PostGIS, RLS, Realtime, Storage, Edge Functions |
| i18n | **i18next** | Mature uz/ru support, namespace organization |
| Navigation | **expo-router** | File-based routing, deep links |
| Server state | **TanStack Query** | Cache, optimistic updates for listings/tasks |
| Client state | **Zustand** | Lightweight session/UI state |
| Maps | **react-native-maps** | Native map performance for Runner mode |

Firebase was evaluated; Supabase is preferred for relational job/escrow data, complex filters, and PostgreSQL RLS.

## Core Domain Modules

### 1. Identity & Profiles

- Roles: `candidate`, `employer`, `runner`, `admin` (users may hold multiple roles).
- Phone OTP verification via Supabase Auth + SMS provider.
- Extended profile: skills, experience, languages, avatar, verification badges.

### 2. Job Board

- **Industries** taxonomy (hierarchical).
- **Vacancies**: title, description, salary range, region, job type (`permanent` | `temporary` | `contract`), experience level.
- **Applications** with status workflow: `submitted` → `reviewed` → `interview` → `offered` → `hired` | `rejected`.
- Employer dashboard: CRUD vacancies, applicant pipeline, analytics.

### 3. Runner Mode (Micro-Tasks)

- **Tasks** with `geography(Point)` location, radius, urgency, price, category.
- Status: `open` → `accepted` → `in_progress` → `completed` → `verified` | `cancelled` | `disputed`.
- Realtime subscription on open tasks within bounding box.
- Runner location updates (throttled) while task is active.

### 4. Media (Images Only)

- Storage bucket `task-images` and `job-images`.
- MIME allowlist: `image/jpeg`, `image/png`, `image/webp`.
- Max size enforced at Storage policy and Edge Function validation.
- No video MIME types accepted anywhere.

### 5. Escrow & Payments

```
Employer funds task → escrow_hold created → Runner completes →
Employer/系统 verifies → escrow_release → Runner wallet credited
```

- `escrow_transactions` ledger (immutable append-only).
- Payment provider webhooks handled by Edge Functions (idempotent).
- Platform fee configurable per category.

### 6. Trust & Communication

- **Conversations** linked to vacancy applications or micro-tasks.
- **Messages** with Realtime delivery and read receipts.
- **Reviews** double-sided (employer ↔ worker) with 1–5 rating + text.
- **Verifications**: phone (required), identity document (optional badge).

## Security Model

- **Row Level Security (RLS)** on every table — no service role on client.
- JWT claims carry `user_id`; policies enforce ownership and role.
- Storage policies: authenticated upload to own folder; public read only for published job/task images.
- Escrow mutations only via Edge Functions with service role.
- Rate limiting on OTP and task creation via Edge Functions.

## Scalability Considerations

| Concern | Strategy |
|---------|----------|
| Geo queries | PostGIS `ST_DWithin`, GiST index on `location` |
| Job search | Composite indexes on `(region_id, job_type, status)` + full-text search (`tsvector`) |
| Realtime fan-out | Channel per task/conversation; bbox channels for map |
| Media | CDN via Supabase Storage; image resizing via Edge Function |
| Multi-region | Supabase project per region or read replicas (Phase 2) |

## API Surface

| Surface | Usage |
|---------|-------|
| Supabase client (PostgREST) | CRUD with RLS for profiles, jobs, tasks, messages |
| Supabase Realtime | Task map updates, chat, application status |
| Edge Functions | `create-escrow`, `release-escrow`, `verify-phone`, `process-webhook` |
| Storage | Direct upload with signed URLs |

## Deployment Topology

```
Production
├── Supabase Cloud (prod project)
├── EAS Build → App Store / Google Play
├── Edge Functions → Supabase Functions runtime
└── CI/CD → GitHub Actions (lint, typecheck, migrate, EAS submit)

Staging
└── Supabase staging project + EAS preview channel
```

## Directory Structure

See repository root `README.md` and `docs/DATABASE.md` for schema and migration details.
