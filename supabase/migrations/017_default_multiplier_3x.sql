-- 017_default_multiplier_3x.sql
-- Update all global default multipliers from 1.3 to 3.0

UPDATE public.billing_config
SET multiplier = 3.0, updated_at = now()
WHERE company_id IS NULL;