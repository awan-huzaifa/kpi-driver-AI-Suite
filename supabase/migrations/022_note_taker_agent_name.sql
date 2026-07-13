
-- Add from_phone column to training_calls (stores the caller's phone number from Assistable webhook)
ALTER TABLE training_calls
  ADD COLUMN IF NOT EXISTS from_phone text;
