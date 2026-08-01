CREATE TABLE IF NOT EXISTS data.companies (
  domain text PRIMARY KEY,
  name text NOT NULL,
  size_bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data.domain_requests
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

ALTER TABLE data.domain_requests
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE INDEX IF NOT EXISTS domain_requests_status_idx
  ON data.domain_requests (status, requested_at);
