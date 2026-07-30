ALTER TABLE note_taker_calls ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]';
