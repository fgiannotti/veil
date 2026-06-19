CREATE TABLE IF NOT EXISTS data.domain_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS domain_requests_domain_idx
  ON data.domain_requests (domain);
