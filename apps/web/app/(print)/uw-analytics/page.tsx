import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PrintClient from "./print-client";
import type { UWReport } from "@/app/underwriting/analytics/analytics-client";

export default async function UWAnalyticsPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("access_role, company_id")
    .eq("id", user.id)
    .single();

  const accessRole   = profile?.access_role ?? "user";
  const isSuperAdmin = accessRole === "super_admin";

  type ReportRow = UWReport & { company_id?: string | null };

  let rows: ReportRow[] = [];
  let companies: { id: string; name: string }[] = [];

  if (isSuperAdmin) {
    const admin = createAdminClient();
    const { data: allReports } = await admin
      .from("underwriting_reports")
      .select("user_id, condition, arv_low, arv_high, repair_cost_low, repair_cost_high, max_offer_low, max_offer_high, investor_profit, property_data, created_at")
      .order("created_at", { ascending: false });

    if (allReports?.length) {
      const uniqueUserIds = [...new Set(allReports.map((r) => r.user_id as string))];
      const { data: userRows } = await admin.from("users").select("id, company_id").in("id", uniqueUserIds);
      const { data: companyRows } = await admin.from("companies").select("id, name").order("name");
      companies = companyRows ?? [];
      const userCompanyMap = new Map((userRows ?? []).map((u) => [u.id, u.company_id as string | null]));
      rows = allReports.map((r) => ({ ...r, company_id: userCompanyMap.get(r.user_id as string) ?? null }));
    }
  } else {
    const { data } = await supabase
      .from("underwriting_reports")
      .select("user_id, condition, arv_low, arv_high, repair_cost_low, repair_cost_high, max_offer_low, max_offer_high, investor_profit, property_data, created_at")
      .order("created_at", { ascending: false });
    rows = (data ?? []).map(r => ({ ...r, company_id: profile?.company_id ?? null }));
  }

  const sp = await searchParams;

  return (
    <PrintClient
      reports={rows}
      companies={companies}
      accessRole={accessRole}
      currentUserId={user.id}
      filters={{
        period:    sp.period    ?? "all",
        from:      sp.from      ?? "",
        to:        sp.to        ?? "",
        companyId: sp.companyId ?? "all",
        userId:    sp.userId    ?? "all",
        city:      sp.city      ?? "all",
      }}
    />
  );
}
