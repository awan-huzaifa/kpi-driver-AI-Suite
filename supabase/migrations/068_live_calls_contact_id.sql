-- Add GHL contact_id to live_calls so system facts (SF1–SF3) can be computed
-- from prior calls for the same contact.
ALTER TABLE public.live_calls
  ADD COLUMN IF NOT EXISTS contact_id text DEFAULT NULL;

-- Index for the SF query: company + contact + scorable + duration
CREATE INDEX IF NOT EXISTS live_calls_contact_id_idx
  ON public.live_calls (company_id, contact_id, scorable, duration_sec)
  WHERE contact_id IS NOT NULL;
