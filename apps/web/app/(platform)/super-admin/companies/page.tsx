import { redirect } from "next/navigation";
import { createClient } from "@kpidriver/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@kpidriver/auth/types";
import CompaniesClient from "./companies-client";

export default async function SuperAdminCompaniesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, access_role, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing, app_kpi_dashboard")
    .eq("id", user.id)
    .single();

  if (profile?.access_role !== "super_admin") redirect("/dashboard");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", user.id)
    .single();

  const planId = (sub?.status === "active" || sub?.status === "trialing") ? sub.plan_id as PlanId : null;

  const admin = createAdminClient();

  const [{ data: companies }, { data: userCounts }, { data: profitRows }] = await Promise.all([
    admin
      .from("companies")
      .select("id, name, ghl_sub_account_id, stripe_customer_id, timezone, wallet_balance, created_at, logo_url")
      .order("created_at", { ascending: false }),
    admin
      .from("users")
      .select("company_id"),
    admin.rpc("get_all_companies_profit_summary"),
  ]);

  // Count users per company
  const countMap: Record<string, number> = {};
  for (const u of userCounts ?? []) {
    if (u.company_id) countMap[u.company_id] = (countMap[u.company_id] ?? 0) + 1;
  }

  // Profit summary per company
  const profitMap: Record<string, { total_billed: number; total_cost: number; profit: number }> = {};
  for (const r of profitRows ?? []) {
    profitMap[r.company_id] = {
      total_billed: Number(r.total_billed ?? 0),
      total_cost:   Number(r.total_cost   ?? 0),
      profit:       Number(r.profit       ?? 0),
    };
  }

  const rows = (companies ?? []).map((c) => ({
    ...c,
    user_count:   countMap[c.id]            ?? 0,
    total_billed: profitMap[c.id]?.total_billed ?? 0,
    total_cost:   profitMap[c.id]?.total_cost   ?? 0,
    profit:       profitMap[c.id]?.profit       ?? 0,
  }));

  return (
    <CompaniesClient
      companies={rows}
      currentUser={{ email: user.email!, fullName: profile?.full_name ?? null }}
      planId={planId}
      access={{
        underwriting:  true,
        salesCoach:    true,
        trainingCoach: true,
        noteTaker:      true,
        dataEnrichment: true,
        skipTracing:    true,
        kpiDashboard:   true,
      }}
    />
  );
}
