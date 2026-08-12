-- Update Axesso default pricing to $0.0018/call for both underwriting and data enrichment.
-- Changes column-level defaults and updates existing global rows.

ALTER TABLE public.billing_config
  ALTER COLUMN axesso_cost_usd    SET DEFAULT 0.001800,
  ALTER COLUMN axesso_charged_usd SET DEFAULT 0.001800;

ALTER TABLE public.billing_config
  ALTER COLUMN de_charged_per_call_usd SET DEFAULT 0.001800;

UPDATE public.billing_config
   SET axesso_cost_usd    = 0.001800,
       axesso_charged_usd = 0.001800
 WHERE app = 'underwriting'
   AND company_id IS NULL;

UPDATE public.billing_config
   SET axesso_cost_usd          = 0.001800,
       de_charged_per_call_usd  = 0.001800
 WHERE app = 'data_enrichment'
   AND company_id IS NULL;
