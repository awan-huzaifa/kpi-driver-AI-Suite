import { redirect } from "next/navigation";
import { createClient } from "@kpidriver/auth/server";
import type { PlanId } from "@kpidriver/auth/types";
import NotificationsClient from "./notifications-client";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, access_role, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing, notify_reports, notify_billing, notify_reports_locked, notify_billing_locked")
      .eq("id", user.id)
      .single(),
    supabase.from("subscriptions").select("plan_id, status").eq("user_id", user.id).single(),
  ]);

  if (!profile) redirect("/dashboard");

  const isActive = sub?.status === "active" || sub?.status === "trialing";
  const isAdmin  = profile.access_role === "admin" || profile.access_role === "super_admin";

  if (!isAdmin) redirect("/dashboard");

  return (
    <NotificationsClient
      currentUser={{ email: user.email!, fullName: profile.full_name ?? null }}
      planId={isActive ? (sub?.plan_id as PlanId | null) : null}
      accessRole={profile.access_role}
      access={{
        underwriting:   isAdmin || (profile.app_underwriting   ?? false),
        salesCoach:     isAdmin || (profile.app_sales_coach    ?? false),
        trainingCoach:  isAdmin || (profile.app_training_coach ?? false),
        noteTaker:      isAdmin || (profile.app_note_taker      ?? false),
        dataEnrichment: isAdmin || (profile.app_data_enrichment ?? false),
        skipTracing:    isAdmin || (profile.app_skip_tracing    ?? false),
      }}
      notifyReports={profile.notify_reports ?? true}
      notifyBilling={profile.notify_billing ?? false}
      notifyReportsLocked={profile.notify_reports_locked ?? false}
      notifyBillingLocked={profile.notify_billing_locked ?? false}
    />
  );
}
