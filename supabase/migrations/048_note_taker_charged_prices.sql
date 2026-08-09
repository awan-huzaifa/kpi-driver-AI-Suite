-- Add per-component charged prices for Note Taker.
-- Two providers: OpenAI Whisper (transcription $/min) + GPT ($/1M tokens).

ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS nt_whisper_charged_per_min  numeric(10,6) DEFAULT 0.006000,
  ADD COLUMN IF NOT EXISTS nt_gpt_input_charged_per_m  numeric(10,4) DEFAULT 0.7500,
  ADD COLUMN IF NOT EXISTS nt_gpt_output_charged_per_m numeric(10,4) DEFAULT 4.5000;

UPDATE public.billing_config
  SET nt_whisper_charged_per_min  = 0.006000,
      nt_gpt_input_charged_per_m  = 0.7500,
      nt_gpt_output_charged_per_m = 4.5000
  WHERE app = 'note_taker' AND company_id IS NULL;
