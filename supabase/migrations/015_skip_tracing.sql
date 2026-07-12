-- ── 015_skip_tracing.sql ──────────────────────────────────────────
-- Adds skip_tracing_logs table + app_skip_tracing flag on users
-- Uses Tracerfy API credits (not AI tokens) so no ai_usage_logs entry

-- 1. Expand CHECK constraints to include skip_tracing

ALTER TABLE billing_config
  DROP CONSTRAINT IF EXISTS billing_config_app_check;
ALTER TABLE billing_config
  ADD CONSTRAINT billing_config_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker', 'data_enrichment', 'skip_tracing'));

ALTER TABLE company_wallet_transactions
  DROP CONSTRAINT IF EXISTS company_wallet_transactions_app_check;
ALTER TABLE company_wallet_transactions
  ADD CONSTRAINT company_wallet_transactions_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker', 'data_enrichment', 'skip_tracing'));

-- 2. Add credit_cost_usd to billing_config (used for per-credit pricing apps like skip_tracing)
ALTER TABLE billing_config
  ADD COLUMN IF NOT EXISTS credit_cost_usd numeric(8,4);

-- 3. Seed billing_config for skip_tracing
--    Default: $0.10/credit base × 1.3 multiplier = $0.13/credit billed to company wallet
INSERT INTO billing_config (app, multiplier, credit_cost_usd)
VALUES ('skip_tracing', 1.3, 0.10)
ON CONFLICT (app) DO NOTHING;

-- 4. skip_tracing_logs table
CREATE TABLE IF NOT EXISTS skip_tracing_logs (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid          NOT NULL REFERENCES companies(id),
  contact_id       text,                                -- GHL contact ID from n8n
  flow_type        text          NOT NULL CHECK (flow_type IN ('apn', 'dnc', 'skiptrace')),
  hit              boolean       NOT NULL DEFAULT false,
  credits_deducted integer       NOT NULL DEFAULT 0,
  cost_usd         numeric(10,6) NOT NULL DEFAULT 0,    -- amount charged to wallet
  persons_count    integer       NOT NULL DEFAULT 0,
  -- APN-specific
  parcel_id        text,
  county           text,
  -- DNC-specific
  phone            text,
  is_clean         boolean,
  national_dnc     boolean,
  state_dnc        boolean,
  dma              boolean,
  litigator        boolean,
  phone_type       text,
  -- Address (skiptrace + APN)
  address          text,
  city             text,
  state            text,
  zip              text,
  find_owner       boolean,                             -- skiptrace only: true = owner lookup
  -- Full Tracerfy response for detail view
  payload          jsonb         NOT NULL DEFAULT '{}',
  created_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skip_tracing_logs_company_idx   ON skip_tracing_logs(company_id);
CREATE INDEX IF NOT EXISTS skip_tracing_logs_created_idx   ON skip_tracing_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS skip_tracing_logs_flow_type_idx ON skip_tracing_logs(flow_type);

ALTER TABLE skip_tracing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skip_tracing_logs_company_select" ON skip_tracing_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "skip_tracing_logs_super_admin_select" ON skip_tracing_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND access_role = 'super_admin')
  );

-- 5. Per-user app access flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_skip_tracing boolean NOT NULL DEFAULT false;

UPDATE users SET app_skip_tracing = true
WHERE access_role IN ('admin', 'super_admin');
