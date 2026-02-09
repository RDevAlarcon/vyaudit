-- PostgreSQL schema for VyAudit MVP
-- Stores each audit by domain/date and full payload.

CREATE TABLE IF NOT EXISTS audit_results (
  id BIGSERIAL PRIMARY KEY,
  domain TEXT NOT NULL,
  target_url TEXT NOT NULL,
  audited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  audit_type TEXT NOT NULL CHECK (audit_type IN ('Free', 'Pro', 'Enterprise')),
  total_score INT NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  payload_json JSONB NOT NULL,
  report_markdown TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_results_domain ON audit_results(domain);
CREATE INDEX IF NOT EXISTS idx_audit_results_audited_at ON audit_results(audited_at DESC);
