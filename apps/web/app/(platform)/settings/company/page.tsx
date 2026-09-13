import { redirect } from "next/navigation";
import { createClient } from "@kpidriver/auth/server";
import type { PlanId } from "@kpidriver/auth/types";
import CompanySettingsClient from "./company-settings-client";

export default async function CompanySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, access_role, company_id, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing, app_kpi_dashboard")
      .eq("id", user.id)
      .single(),
    supabase.from("subscriptions").select("plan_id, status").eq("user_id", user.id).single(),
  ]);

  const isAdmin = profile?.access_role === "admin" || profile?.access_role === "super_admin";
  if (!isAdmin) redirect("/dashboard");

  const planId   = sub?.plan_id as PlanId | null;
  const isActive = sub?.status === "active" || sub?.status === "trialing";

  const { data: company } = profile?.company_id
    ? await supabase
        .from("companies")
        .select("id, name, ghl_sub_account_id, wallet_balance, created_at, logo_url, timezone")
        .eq("id", profile.company_id)
        .single()
    : { data: null };

  const { count: memberCount } = profile?.company_id
    ? await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
    : { count: 0 };

  return (
    <CompanySettingsClient
      currentUser={{ email: user.email!, fullName: profile?.full_name ?? null }}
      planId={isActive ? planId : null}
      accessRole={profile?.access_role ?? "user"}
      access={{
        underwriting:  isAdmin || (profile?.app_underwriting   ?? false),
        salesCoach:    isAdmin || (profile?.app_sales_coach    ?? false),
        trainingCoach: isAdmin || (profile?.app_training_coach ?? false),
        noteTaker:      isAdmin || (profile?.app_note_taker      ?? false),
        dataEnrichment: isAdmin || (profile?.app_data_enrichment ?? false),
        skipTracing:    isAdmin || (profile?.app_skip_tracing    ?? false),
        kpiDashboard:   isAdmin || (profile?.app_kpi_dashboard   ?? false),
      }}
      company={company ? {
        id:                 company.id,
        name:               company.name,
        ghl_sub_account_id: company.ghl_sub_account_id ?? "",
        wallet_balance:     company.wallet_balance,
        created_at:         company.created_at,
        member_count:       memberCount ?? 0,
        logo_url:           (company as any).logo_url ?? null,
        timezone:           (company as any).timezone ?? "America/New_York",
      } : null}
    />
  );
}
