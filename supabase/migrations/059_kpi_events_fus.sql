-- 059_kpi_events_fus.sql
-- Adds fus (Follow-Up Specialist name) column to kpi_events.

ALTER TABLE kpi_events
  ADD COLUMN IF NOT EXISTS fus text;
