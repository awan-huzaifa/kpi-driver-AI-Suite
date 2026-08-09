  -- Add Assistable per-minute charged price column to billing_config.
  -- Also correct training_coach Claude rates to Sonnet 4.6 pricing ($3/$15).

  ALTER TABLE public.billing_config
    ADD COLUMN IF NOT EXISTS assistable_charged_per_min numeric(10,6) DEFAULT 0.150000;

  UPDATE public.billing_config
    SET assistable_charged_per_min  = 0.150000,
        claude_input_charged_per_m  = 3.0000,
        claude_output_charged_per_m = 15.0000
    WHERE app = 'training_coach' AND company_id IS NULL;
