import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
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
  const isAdmin      = accessRole === "admin" || isSuperAdmin;

  type ReportRow = {
    user_id:          string;
    condition:        string | null;
    arv_low:          number | null;
    arv_high:         number | null;
    repair_cost_low:  number | null;
    repair_cost_high: number | null;
    max_offer_low:    number | null;
    max_offer_high:   number | null;
    investor_profit:  number | null;
    property_data:    Record<string, unknown> | null;
    created_at:       string;
    company_id?:      string | null;
  };

  let rows: ReportRow[] = [];
  let users: { id: string; name: string; company_id?: string | null }[] = [];
  let companies: { id: string; name: string }[] = [];

  if (isSuperAdmin) {
    const admin = createAdminClient();
    const { data: allReports } = await admin
      .from("underwriting_reports")
      .select("user_id, condition, arv_low, arv_high, repair_cost_low, repair_cost_high, max_offer_low, max_offer_high, investor_profit, property_data, created_at")
      .order("created_at", { ascending: false });

    if (allReports?.length) {
      const uniqueUserIds = [...new Set(allReports.map((r) => r.user_id as string))];
      const { data: userRows } = await admin
        .from("users")
        .select("id, full_name, company_id")
        .in("id", uniqueUserIds);

      const { data: companyRows } = await admin
        .from("companies")
        .select("id, name")
        .order("name");

      companies = companyRows ?? [];

      const userCompanyMap = new Map((userRows ?? []).map((u) => [u.id, u.company_id as string | null]));

      rows = allReports.map((r) => ({
        ...r,
        company_id: userCompanyMap.get(r.user_id as string) ?? null,
      }));

      users = (userRows ?? []).map((u) => ({
        id:         u.id,
        name:       u.full_name ?? "Unknown",
        company_id: u.company_id,
      }));
    }
  } else {
    let query = supabase
      .from("underwriting_reports")
      .select("user_id, condition, arv_low, arv_high, repair_cost_low, repair_cost_high, max_offer_low, max_offer_high, investor_profit, property_data, created_at")
      .order("created_at", { ascending: false });

    if (accessRole === "user") {
      query = query.eq("user_id", user.id);
    }

    const { data } = await query;
    rows = data ?? [];

    if (isAdmin && rows.length) {
      const uniqueIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: userRows } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", uniqueIds);
      users = (userRows ?? []).map((u) => ({ id: u.id, name: u.full_name ?? "Unknown" }));
    }
  }

  return (
    <AnalyticsClient
      reports={rows}
      users={users}
      companies={companies}
      accessRole={accessRole}
      currentUserId={user.id}
    />
  );
}
