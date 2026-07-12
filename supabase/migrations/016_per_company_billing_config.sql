-- 016_per_company_billing_config.sql
-- Make billing_config per-company instead of global.
-- Each company can override the multiplier per app.
-- Rows with company_id IS NULL remain as global defaults (fallback).

-- 1. Add company_id column (nullable = global default)
ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Drop the old global UNIQUE constraint on app alone
ALTER TABLE public.billing_config DROP CONSTRAINT IF EXISTS billing_config_app_key;

-- 3. Partial unique index: one global default row per app
CREATE UNIQUE INDEX IF NOT EXISTS billing_config_global_uidx
  ON public.billing_config (app)
  WHERE company_id IS NULL;

-- 4. Partial unique index: one override row per (company, app)
CREATE UNIQUE INDEX IF NOT EXISTS billing_config_company_uidx
  ON public.billing_config (company_id, app)
  WHERE company_id IS NOT NULL;

-- Existing rows keep company_id = NULL and become the global defaults.
-- No data migration needed.
