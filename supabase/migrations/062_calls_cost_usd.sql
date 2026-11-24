-- 062_calls_cost_usd.sql
-- Adds cost_usd to live_calls and training_calls for per-row cost visibility.

ALTER TABLE live_calls
  ADD COLUMN IF NOT EXISTS cost_usd numeric(10,6) NOT NULL DEFAULT 0;

ALTER TABLE training_calls
  ADD COLUMN IF NOT EXISTS cost_usd numeric(10,6) NOT NULL DEFAULT 0;
