-- The IN-subquery in 024 runs with the caller's RLS permissions on the users
-- table, which can cause unexpected empty results. Replace it with a
-- SECURITY DEFINER helper (same pattern as get_my_company_id) that bypasses
-- RLS when doing the company lookup.

DROP POLICY IF EXISTS "deals: users read own company" ON public.deals;

CREATE OR REPLACE FUNCTION public.in_same_company(other_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.get_my_company_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = other_user_id
        AND company_id = public.get_my_company_id()
    );
$$;

GRANT EXECUTE ON FUNCTION public.in_same_company(uuid) TO authenticated;

CREATE POLICY "deals: users read own company"
  ON public.deals FOR SELECT TO authenticated
  USING (public.in_same_company(user_id));
