-- ── 013_data_enrichment.sql ───────────────────────────────────────
-- Adds data_enrichment_logs table + app_data_enrichment flag on users

-- 1. Expand CHECK constraints to include data_enrichment

ALTER TABLE billing_config
  DROP CONSTRAINT IF EXISTS billing_config_app_check;
ALTER TABLE billing_config
  ADD CONSTRAINT billing_config_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker', 'data_enrichment'));

ALTER TABLE company_wallet_transactions
  DROP CONSTRAINT IF EXISTS company_wallet_transactions_app_check;
ALTER TABLE company_wallet_transactions
  ADD CONSTRAINT company_wallet_transactions_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker', 'data_enrichment'));

ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_app_check;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker', 'data_enrichment'));

ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_entity_type_check;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_entity_type_check
    CHECK (entity_type IN ('deal', 'live_call', 'training_call', 'note_taker_call', 'enrichment_log'));

-- 2. data_enrichment_logs
CREATE TABLE IF NOT EXISTS data_enrichment_logs (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid          NOT NULL REFERENCES companies(id),
  external_id     text          UNIQUE,           -- idempotency key from n8n
  fields          jsonb         NOT NULL DEFAULT '[]', -- dynamic [{key,value}] array
  input_tokens    integer       NOT NULL DEFAULT 0,
  output_tokens   integer       NOT NULL DEFAULT 0,
  cost_usd        numeric(10,6) NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE data_enrichment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrichment_logs_company_select" ON data_enrichment_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "enrichment_logs_super_admin_select" ON data_enrichment_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND access_role = 'super_admin')
  );

-- 3. Per-user app access flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_data_enrichment boolean NOT NULL DEFAULT false;

UPDATE users SET app_data_enrichment = true
WHERE access_role IN ('admin', 'super_admin');

-- 4. Seed billing_config
INSERT INTO billing_config (app, multiplier)
VALUES ('data_enrichment', 1.3)
ON CONFLICT (app) DO NOTHING;
