import { redirect } from "next/navigation";
import { createClient } from "@kpidriver/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@kpidriver/auth/types";
import BillingConfigClient from "./billing-config-client";

export default async function BillingConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, access_role")
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
  const [{ data: config }, { data: companies }] = await Promise.all([
    admin.from("billing_config").select("id, app, multiplier, company_id, updated_at").order("app"),
    admin.from("companies").select("id, name").order("name"),
  ]);

  return (
    <BillingConfigClient
      config={config ?? []}
      companies={companies ?? []}
      currentUser={{ email: user.email!, fullName: profile?.full_name ?? null }}
      planId={planId}
      access={{ underwriting: true, salesCoach: true, trainingCoach: true, noteTaker: true, dataEnrichment: true, skipTracing: true }}
    />
  );
}
