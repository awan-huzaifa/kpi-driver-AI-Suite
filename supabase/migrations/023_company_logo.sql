-- Add company logo URL column
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;
