-- 061_note_taker_stage.sql
-- Adds stage column to note_taker_calls.

ALTER TABLE note_taker_calls
  ADD COLUMN IF NOT EXISTS stage text;
