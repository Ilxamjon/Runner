# Runner — Database Schema

PostgreSQL (Supabase) with PostGIS extension for geolocated micro-tasks.

## Entity Relationship (simplified)

```
profiles ──┬── vacancies ──┬── applications
           │               └── vacancy_images
           ├── micro_tasks ──┬── task_images
           │                 ├── task_assignments
           │                 └── escrow_transactions
           ├── runner_profiles (location, availability)
           ├── conversations ── messages
           ├── reviews
           └── verifications

regions ── vacancies, micro_tasks
industries ── vacancies
task_categories ── micro_tasks
wallets ── wallet_ledger
```

## Enums

| Enum | Values |
|------|--------|
| `user_role` | candidate, employer, runner, admin |
| `job_type` | permanent, temporary, contract |
| `experience_level` | none, junior, mid, senior |
| `vacancy_status` | draft, published, closed, archived |
| `application_status` | submitted, reviewed, interview, offered, hired, rejected, withdrawn |
| `task_status` | open, accepted, in_progress, completed, verified, cancelled, disputed |
| `escrow_status` | pending, held, released, refunded, disputed |
| `verification_type` | phone, identity, business |
| `verification_status` | pending, approved, rejected |
| `message_type` | text, image, system |

## Key Tables

### `profiles`
Extends `auth.users`. Stores display name, avatar, roles array, locale (`uz` | `ru`), phone.

### `vacancies`
Traditional job postings with salary range, region, industry, job type, experience, full-text search vector.

### `micro_tasks`
Geolocated tasks with `location geography(POINT, 4326)`, price, urgency, category, status. GiST index for proximity queries.

### `escrow_transactions`
Immutable ledger linking to `micro_tasks` or milestone-based job payments.

### `conversations` / `messages`
Polymorphic parent (`vacancy_application_id` OR `micro_task_id`).

## Indexes

- `micro_tasks`: GiST on `location`, btree on `(status, created_at DESC)`
- `vacancies`: GIN on `search_vector`, btree on `(region_id, status, job_type)`
- `messages`: btree on `(conversation_id, created_at)`

## Migrations

Located in `supabase/migrations/`:

1. `00001_initial_schema.sql` — extensions, enums, tables, indexes, triggers
2. `00002_rls_policies.sql` — Row Level Security for all tables
3. `00003_storage_policies.sql` — image-only buckets and policies

Run locally: `npx supabase db reset`
