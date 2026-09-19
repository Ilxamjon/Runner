-- Runner: Initial schema
-- Requires: Supabase PostgreSQL with PostGIS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('candidate', 'employer', 'runner', 'admin');
CREATE TYPE job_type AS ENUM ('permanent', 'temporary', 'contract');
CREATE TYPE experience_level AS ENUM ('none', 'junior', 'mid', 'senior');
CREATE TYPE vacancy_status AS ENUM ('draft', 'published', 'closed', 'archived');
CREATE TYPE application_status AS ENUM (
  'submitted', 'reviewed', 'interview', 'offered', 'hired', 'rejected', 'withdrawn'
);
CREATE TYPE task_status AS ENUM (
  'open', 'accepted', 'in_progress', 'completed', 'verified', 'cancelled', 'disputed'
);
CREATE TYPE task_urgency AS ENUM ('normal', 'urgent', 'asap');
CREATE TYPE escrow_status AS ENUM ('pending', 'held', 'released', 'refunded', 'disputed');
CREATE TYPE verification_type AS ENUM ('phone', 'identity', 'business');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE message_type AS ENUM ('text', 'image', 'system');
CREATE TYPE app_locale AS ENUM ('uz', 'ru');

-- =============================================================================
-- REGIONS & TAXONOMY
-- =============================================================================

CREATE TABLE regions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_uz     TEXT NOT NULL,
  name_ru     TEXT NOT NULL,
  parent_id   UUID REFERENCES regions(id) ON DELETE SET NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE industries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_uz     TEXT NOT NULL,
  name_ru     TEXT NOT NULL,
  parent_id   UUID REFERENCES industries(id) ON DELETE SET NULL,
  icon        TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,
  name_uz     TEXT NOT NULL,
  name_ru     TEXT NOT NULL,
  icon        TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- PROFILES
-- =============================================================================

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  phone_verified  BOOLEAN NOT NULL DEFAULT false,
  avatar_url      TEXT,
  bio             TEXT,
  roles           user_role[] NOT NULL DEFAULT '{candidate}',
  locale          app_locale NOT NULL DEFAULT 'uz',
  region_id       UUID REFERENCES regions(id) ON DELETE SET NULL,
  rating_avg      NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  rating_count    INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE candidate_profiles (
  user_id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  headline          TEXT,
  experience_years  INT NOT NULL DEFAULT 0,
  experience_level  experience_level NOT NULL DEFAULT 'none',
  skills            TEXT[] NOT NULL DEFAULT '{}',
  education         JSONB NOT NULL DEFAULT '[]',
  work_history      JSONB NOT NULL DEFAULT '[]',
  resume_url        TEXT,
  is_public         BOOLEAN NOT NULL DEFAULT true,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employer_profiles (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name  TEXT NOT NULL,
  description   TEXT,
  logo_url      TEXT,
  website       TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE runner_profiles (
  user_id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_available      BOOLEAN NOT NULL DEFAULT false,
  current_location  GEOGRAPHY(POINT, 4326),
  location_updated  TIMESTAMPTZ,
  completed_tasks   INT NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_runner_profiles_location ON runner_profiles USING GIST (current_location);

-- =============================================================================
-- JOB BOARD
-- =============================================================================

CREATE TABLE vacancies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  industry_id       UUID REFERENCES industries(id) ON DELETE SET NULL,
  region_id         UUID REFERENCES regions(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  job_type          job_type NOT NULL,
  experience_level  experience_level NOT NULL DEFAULT 'none',
  salary_min        BIGINT,
  salary_max        BIGINT,
  salary_currency   TEXT NOT NULL DEFAULT 'UZS',
  is_salary_visible BOOLEAN NOT NULL DEFAULT true,
  status            vacancy_status NOT NULL DEFAULT 'draft',
  search_vector     TSVECTOR,
  published_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vacancies_region_status ON vacancies (region_id, status, job_type);
CREATE INDEX idx_vacancies_employer ON vacancies (employer_id, status);
CREATE INDEX idx_vacancies_search ON vacancies USING GIN (search_vector);

CREATE TABLE vacancy_images (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vacancy_id   UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE applications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vacancy_id    UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  candidate_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter  TEXT,
  status        application_status NOT NULL DEFAULT 'submitted',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vacancy_id, candidate_id)
);

CREATE INDEX idx_applications_vacancy ON applications (vacancy_id, status);
CREATE INDEX idx_applications_candidate ON applications (candidate_id, status);

-- =============================================================================
-- MICRO-TASKS (RUNNER MODE)
-- =============================================================================

CREATE TABLE micro_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES task_categories(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  address_text    TEXT,
  region_id       UUID REFERENCES regions(id) ON DELETE SET NULL,
  price_amount    BIGINT NOT NULL CHECK (price_amount > 0),
  price_currency  TEXT NOT NULL DEFAULT 'UZS',
  urgency         task_urgency NOT NULL DEFAULT 'normal',
  status          task_status NOT NULL DEFAULT 'open',
  radius_meters   INT NOT NULL DEFAULT 5000,
  scheduled_at    TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_micro_tasks_location ON micro_tasks USING GIST (location);
CREATE INDEX idx_micro_tasks_status_created ON micro_tasks (status, created_at DESC);
CREATE INDEX idx_micro_tasks_employer ON micro_tasks (employer_id, status);

CREATE TABLE task_images (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      UUID NOT NULL REFERENCES micro_tasks(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES micro_tasks(id) ON DELETE CASCADE,
  runner_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id)
);

CREATE INDEX idx_task_assignments_runner ON task_assignments (runner_id);

-- =============================================================================
-- ESCROW & WALLETS
-- =============================================================================

CREATE TABLE wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance     BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency    TEXT NOT NULL DEFAULT 'UZS',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE escrow_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  micro_task_id     UUID REFERENCES micro_tasks(id) ON DELETE SET NULL,
  payer_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  payee_id          UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  amount            BIGINT NOT NULL CHECK (amount > 0),
  platform_fee      BIGINT NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'UZS',
  status            escrow_status NOT NULL DEFAULT 'pending',
  external_ref      TEXT,
  idempotency_key   TEXT UNIQUE,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_escrow_task ON escrow_transactions (micro_task_id, status);
CREATE INDEX idx_escrow_payer ON escrow_transactions (payer_id, status);

CREATE TABLE wallet_ledger (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id             UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  amount                BIGINT NOT NULL,
  balance_after         BIGINT NOT NULL,
  description           TEXT,
  escrow_transaction_id UUID REFERENCES escrow_transactions(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_ledger_wallet ON wallet_ledger (wallet_id, created_at DESC);

-- =============================================================================
-- MESSAGING
-- =============================================================================

CREATE TABLE conversations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vacancy_application_id  UUID UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  micro_task_id           UUID UNIQUE REFERENCES micro_tasks(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (vacancy_application_id IS NOT NULL AND micro_task_id IS NULL) OR
    (vacancy_application_id IS NULL AND micro_task_id IS NOT NULL)
  )
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type    message_type NOT NULL DEFAULT 'text',
  body            TEXT,
  image_path      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);

-- =============================================================================
-- REVIEWS & VERIFICATION
-- =============================================================================

CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  micro_task_id UUID REFERENCES micro_tasks(id) ON DELETE SET NULL,
  vacancy_id    UUID REFERENCES vacancies(id) ON DELETE SET NULL,
  rating        SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reviewer_id != reviewee_id)
);

CREATE INDEX idx_reviews_reviewee ON reviews (reviewee_id, created_at DESC);

CREATE TABLE verifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         verification_type NOT NULL,
  status       verification_status NOT NULL DEFAULT 'pending',
  document_url TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verifications_user ON verifications (user_id, type);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_vacancies_updated_at BEFORE UPDATE ON vacancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_micro_tasks_updated_at BEFORE UPDATE ON micro_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_escrow_updated_at BEFORE UPDATE ON escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_vacancy_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_vacancy_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON vacancies
  FOR EACH ROW EXECUTE FUNCTION update_vacancy_search_vector();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', 'User'));
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- HELPER: nearby open tasks
-- =============================================================================

CREATE OR REPLACE FUNCTION nearby_open_tasks(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INT DEFAULT 10000
)
RETURNS SETOF micro_tasks
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM micro_tasks
  WHERE status = 'open'
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY created_at DESC;
$$;
