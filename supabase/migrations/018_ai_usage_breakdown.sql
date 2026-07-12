-- Add cost_breakdown column to ai_usage_logs
-- Stores per-API multiplied costs for workflows that use multiple APIs (e.g. Deal Underwriting)
ALTER TABLE ai_usage_logs
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT NULL;
