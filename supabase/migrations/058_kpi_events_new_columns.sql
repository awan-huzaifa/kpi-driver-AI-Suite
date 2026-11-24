-- 058_kpi_events_new_columns.sql
-- Adds dedicated columns for every ACQ leads webhook field.
-- Moves score + feedback out of metadata into proper columns.
-- Metadata is now true overflow only.

ALTER TABLE kpi_events
  ADD COLUMN IF NOT EXISTS call_count    integer,
  ADD COLUMN IF NOT EXISTS pipeline      text,
  ADD COLUMN IF NOT EXISTS underwriter   text,
  ADD COLUMN IF NOT EXISTS temperature   text,
  ADD COLUMN IF NOT EXISTS actual_profit numeric(14,2),
  ADD COLUMN IF NOT EXISTS score         numeric(5,2),
  ADD COLUMN IF NOT EXISTS feedback      text;

-- Indexes for common dashboard filter patterns
CREATE INDEX IF NOT EXISTS kpi_events_stage       ON kpi_events (company_id, stage);
CREATE INDEX IF NOT EXISTS kpi_events_pipeline    ON kpi_events (company_id, pipeline);
CREATE INDEX IF NOT EXISTS kpi_events_temperature ON kpi_events (company_id, temperature);
CREATE INDEX IF NOT EXISTS kpi_events_acq_manager ON kpi_events (company_id, acq_manager);
CREATE INDEX IF NOT EXISTS kpi_events_underwriter ON kpi_events (company_id, underwriter);
