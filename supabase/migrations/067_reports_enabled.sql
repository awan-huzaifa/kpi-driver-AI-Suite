ALTER TABLE companies ADD COLUMN IF NOT EXISTS reports_enabled boolean NOT NULL DEFAULT true;
