import { redirect } from "next/navigation";
import { createClient } from "@kpidriver/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@kpidriver/auth/types";
import type { AccessRole } from "@/types/database";
import UsersClient from "./users-client";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, access_role, company_id, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing")
      .eq("id", user.id)
      .single(),
    supabase.from("subscriptions").select("plan_id, status").eq("user_id", user.id).single(),
  ]);

  if (!profile || !["admin", "super_admin"].includes(profile.access_role)) {
    redirect("/dashboard");
  }

  const isSuperAdmin = profile.access_role === "super_admin";
  const isAdmin = true;
  const planId = (sub?.status === "active" || sub?.status === "trialing") ? sub.plan_id as PlanId : null;

  const admin = createAdminClient();

  const [usersResult, companiesResult] = await Promise.all([
    isSuperAdmin
      ? admin
          .from("users")
          .select("id, full_name, email, access_role, agent_type, company_id, avatar_url, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing, is_active, created_at, notify_reports, notify_billing, notify_reports_locked, notify_billing_locked")
          .order("created_at", { ascending: true })
      : supabase
          .from("users")
          .select("id, full_name, email, access_role, agent_type, company_id, avatar_url, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing, is_active, created_at, notify_reports, notify_billing, notify_reports_locked, notify_billing_locked")
          .eq("company_id", profile.company_id!)
          .order("created_at", { ascending: true }),
    isSuperAdmin
      ? admin.from("companies").select("id, name").order("name")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <UsersClient
      users={usersResult.data ?? []}
      companies={companiesResult.data ?? []}
      currentUserId={user.id}
      accessRole={profile.access_role as AccessRole}
      planId={planId}
      access={{
        underwriting:  isAdmin || (profile.app_underwriting  ?? false),
        salesCoach:    isAdmin || (profile.app_sales_coach   ?? false),
        trainingCoach: isAdmin || (profile.app_training_coach ?? false),
        noteTaker:      isAdmin || (profile.app_note_taker      ?? false),
        dataEnrichment: isAdmin || (profile.app_data_enrichment ?? false),
        skipTracing:    isAdmin || (profile.app_skip_tracing    ?? false),
      }}
      currentUser={{ email: user.email!, fullName: profile.full_name ?? null }}
    />
  );
}
