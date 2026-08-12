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
    admin.from("billing_config").select("id, app, multiplier, company_id, updated_at, rentcast_cost_usd, axesso_cost_usd, rentcast_charged_usd, axesso_charged_usd, claude_input_cost_per_m, claude_output_cost_per_m, claude_input_charged_per_m, claude_output_charged_per_m, assistable_cost_per_min, assistable_charged_per_min, credit_cost_usd, st_normal_rate_usd, st_advanced_rate_usd, st_apn_rate_usd, st_dnc_rate_usd, st_charged_normal_usd, st_charged_advanced_usd, st_charged_apn_usd, st_charged_dnc_usd, nt_whisper_cost_per_min, nt_gpt_input_cost_per_m, nt_gpt_output_cost_per_m, nt_whisper_charged_per_min, nt_gpt_input_charged_per_m, nt_gpt_output_charged_per_m, de_charged_per_call_usd").order("app"),
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
