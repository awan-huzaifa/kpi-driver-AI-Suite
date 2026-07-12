-- ── 012_note_taker.sql ────────────────────────────────────────────
-- Adds note_taker_calls table + app_note_taker flag on users

-- 1. note_taker_calls
CREATE TABLE IF NOT EXISTS note_taker_calls (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL REFERENCES companies(id),
  external_call_id  text        UNIQUE,          -- n8n/webhook idempotency key
  call_direction    text,                         -- "inbound" | "outbound"
  to_number         text,
  from_number       text,
  ai_summary        text,                         -- AI-generated summary from n8n
  normal_summary    text,                         -- plain transcript summary from n8n
  input_tokens      integer     NOT NULL DEFAULT 0,
  output_tokens     integer     NOT NULL DEFAULT 0,
  cost_usd          numeric(10,6) NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE note_taker_calls ENABLE ROW LEVEL SECURITY;

-- Company members (any role) can view their company's calls
CREATE POLICY "note_taker_calls_company_select" ON note_taker_calls
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- super_admin can view all
CREATE POLICY "note_taker_calls_super_admin_select" ON note_taker_calls
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND access_role = 'super_admin')
  );

-- 2. Per-user app access flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_note_taker boolean NOT NULL DEFAULT false;

-- Back-fill admins / super_admins so they always have access
UPDATE users SET app_note_taker = true
WHERE access_role IN ('admin', 'super_admin');

-- 3. Expand CHECK constraints to include note_taker

-- billing_config.app
ALTER TABLE billing_config
  DROP CONSTRAINT IF EXISTS billing_config_app_check;
ALTER TABLE billing_config
  ADD CONSTRAINT billing_config_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker'));

-- company_wallet_transactions.app
ALTER TABLE company_wallet_transactions
  DROP CONSTRAINT IF EXISTS company_wallet_transactions_app_check;
ALTER TABLE company_wallet_transactions
  ADD CONSTRAINT company_wallet_transactions_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker'));

-- ai_usage_logs.app
ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_app_check;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker'));

-- ai_usage_logs.entity_type
ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_entity_type_check;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_entity_type_check
    CHECK (entity_type IN ('deal', 'live_call', 'training_call', 'note_taker_call'));

-- 4. Seed billing_config for note_taker (same 30% default markup)
INSERT INTO billing_config (app, multiplier)
VALUES ('note_taker', 1.3)
ON CONFLICT (app) DO NOTHING;
