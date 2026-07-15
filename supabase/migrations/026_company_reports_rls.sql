-- Regular users can SELECT underwriting_reports for any deal in their company.
-- Mirrors the "deals: users read own company" policy from migration 025.
-- in_same_company() is SECURITY DEFINER so it bypasses users-table RLS safely.

CREATE POLICY "underwriting_reports: users read own company"
  ON public.underwriting_reports FOR SELECT TO authenticated
  USING (public.in_same_company(user_id));
