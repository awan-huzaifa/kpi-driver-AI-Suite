-- Expand ai_usage_logs CHECK constraints to cover all apps that log AI usage
ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_app_check;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker'));

ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_entity_type_check;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_entity_type_check
    CHECK (entity_type IN ('deal', 'live_call', 'training_call', 'note_taker_call'));

-- Add cost_breakdown column if not already added by migration 018
ALTER TABLE ai_usage_logs
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT NULL;

-- Seed billing_config global defaults for note_taker and data_enrichment
-- Uses the partial index predicate from migration 016 (WHERE company_id IS NULL)
INSERT INTO billing_config (app, multiplier, company_id)
VALUES
  ('note_taker',      3.0, NULL),
  ('data_enrichment', 3.0, NULL)
ON CONFLICT (app) WHERE company_id IS NULL DO NOTHING;

-- Ensure company_wallet_transactions constraint covers all apps
-- (idempotent — safe to re-run even if migration 015 already applied this)
ALTER TABLE company_wallet_transactions
  DROP CONSTRAINT IF EXISTS company_wallet_transactions_app_check;
ALTER TABLE company_wallet_transactions
  ADD CONSTRAINT company_wallet_transactions_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker', 'data_enrichment', 'skip_tracing'));
