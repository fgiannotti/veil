-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS data;

-- =======================
-- AUTH SCHEMA
-- =======================

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  email_verified timestamptz,
  name text,
  image text,
  password_hash text,
  profile_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.accounts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS auth.sessions (
  session_token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS auth.work_email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  email_hash text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_email_verifications_profile_idx
  ON auth.work_email_verifications (profile_id);

-- =======================
-- DATA SCHEMA
-- NOTE: No FKs to auth.*; linked only by opaque profile_id.
-- =======================

CREATE TABLE IF NOT EXISTS data.company_badges (
  profile_id uuid NOT NULL,
  domain text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  current_company text NOT NULL DEFAULT 'true',
  PRIMARY KEY (profile_id, domain)
);

CREATE INDEX IF NOT EXISTS company_badges_profile_idx
  ON data.company_badges (profile_id);

CREATE TABLE IF NOT EXISTS data.salary_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  role text NOT NULL,
  seniority text NOT NULL,
  company_domain text NOT NULL,
  company_size_bucket text NOT NULL,
  net_ars bigint NOT NULL,
  payment_month date NOT NULL,
  source text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, payment_month)
);

-- TimescaleDB hypertable on payment_month
SELECT create_hypertable(
  'data.salary_entries',
  'payment_month',
  if_not_exists => TRUE,
  migrate_data => TRUE,
  chunk_time_interval => INTERVAL '1 year'
);

CREATE INDEX IF NOT EXISTS salary_cohort_idx
  ON data.salary_entries (role, seniority, company_size_bucket, payment_month DESC);

CREATE INDEX IF NOT EXISTS salary_profile_idx
  ON data.salary_entries (profile_id, payment_month DESC);

CREATE TABLE IF NOT EXISTS data.economic_indicators (
  date date PRIMARY KEY,
  usd_blue_buy double precision NOT NULL,
  usd_blue_sell double precision NOT NULL,
  ipc_index double precision NOT NULL,
  source text NOT NULL DEFAULT 'mixed',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data.grapevine_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  company_domain text NOT NULL,
  body text NOT NULL,
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grapevine_company_idx
  ON data.grapevine_posts (company_domain, created_at DESC);
