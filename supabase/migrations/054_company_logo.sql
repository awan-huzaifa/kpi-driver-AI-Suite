-- Add logo_url column to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Create a public storage bucket for company logos (run separately in Supabase dashboard
-- if the bucket doesn't exist yet):
--
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('company-logos', 'company-logos', true)
--   ON CONFLICT (id) DO NOTHING;
--
--   CREATE POLICY "Public read company logos"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'company-logos');
--
--   CREATE POLICY "Service role upload company logos"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'company-logos');
--
--   CREATE POLICY "Service role delete company logos"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'company-logos');
