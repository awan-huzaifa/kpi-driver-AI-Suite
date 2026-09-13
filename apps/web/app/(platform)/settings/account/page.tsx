import { redirect } from "next/navigation";
import { createClient } from "@kpidriver/auth/server";
import type { PlanId } from "@kpidriver/auth/types";
import AccountSettingsClient from "./account-settings-client";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, access_role, avatar_url, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing, app_kpi_dashboard")
      .eq("id", user.id)
      .single(),
    supabase.from("subscriptions").select("plan_id, status").eq("user_id", user.id).single(),
  ]);

  const planId   = sub?.plan_id as PlanId | null;
  const isActive = sub?.status === "active" || sub?.status === "trialing";
  const isAdmin  = profile?.access_role === "admin" || profile?.access_role === "super_admin";

  return (
    <AccountSettingsClient
      currentUser={{
        id:        user.id,
        email:     user.email!,
        fullName:  profile?.full_name  ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      }}
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
    />
  );
}
