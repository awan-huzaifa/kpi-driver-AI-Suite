-- Add agent_name column to note_taker_calls
ALTER TABLE note_taker_calls
  ADD COLUMN IF NOT EXISTS agent_name text DEFAULT NULL;
