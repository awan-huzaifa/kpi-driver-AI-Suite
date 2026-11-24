-- 060_note_taker_contact_name_agent_type_duration.sql
-- Adds contact_name, agent_type, and duration_sec to note_taker_calls
-- for UI consistency with the Sales Coach table.

ALTER TABLE note_taker_calls
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS agent_type   text,
  ADD COLUMN IF NOT EXISTS duration_sec integer;
