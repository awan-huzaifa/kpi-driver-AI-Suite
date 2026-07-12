-- Add data_enrichment to ai_usage_logs constraints
ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_app_check;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_app_check
    CHECK (app IN ('underwriting', 'sales_coach', 'training_coach', 'note_taker', 'data_enrichment'));

ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_entity_type_check;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_entity_type_check
    CHECK (entity_type IN ('deal', 'live_call', 'training_call', 'note_taker_call', 'data_enrichment_log'));
