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

CREATE TABLE IF NOT EXISTS audit_access_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'used', 'expired')) DEFAULT 'pending',
  customer_email TEXT NOT NULL,
  allowed_domain TEXT,
  remaining_uses INT NOT NULL DEFAULT 1 CHECK (remaining_uses >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  audit_result_id BIGINT REFERENCES audit_results(id) ON DELETE SET NULL,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_access_tokens_status ON audit_access_tokens(status);
CREATE INDEX IF NOT EXISTS idx_audit_access_tokens_expires_at ON audit_access_tokens(expires_at);
