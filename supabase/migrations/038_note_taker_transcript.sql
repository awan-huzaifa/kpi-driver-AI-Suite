-- Add transcript column to note_taker_calls
ALTER TABLE note_taker_calls
  ADD COLUMN IF NOT EXISTS transcript text;
