import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintClient from "./print-client";
import type { AnalyticsCall } from "@/app/sales-coach/analytics/page";
import type { AccessRole } from "@/types/database";

export default async function SCAnalyticsPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id")
    .eq("id", user.id)
    .single();

  const role      = (profile?.access_role ?? "user") as AccessRole;
  const companyId = profile?.company_id ?? "";

  let query = supabase
    .from("live_calls")
    .select("user_id, company_id, score, scorable, direction, call_result, duration_sec, created_at, evaluation, agent:users(full_name, agent_type)")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (role === "admin" || role === "user") {
    if (companyId) query = query.eq("company_id", companyId);
    else           query = query.eq("user_id", profile!.id);
  }

  const { data: calls } = await query;
  const sp = await searchParams;

  return (
    <PrintClient
      calls={(calls ?? []) as unknown as AnalyticsCall[]}
      accessRole={role}
      currentUserId={profile?.id ?? ""}
      filters={{
        period:     sp.period     ?? "all",
        from:       sp.from       ?? "",
        to:         sp.to         ?? "",
        direction:  sp.direction  ?? "all",
        duration:   sp.duration   ?? "all",
        role:       sp.role       ?? "all",
        scorable:   sp.scorable   ?? "all",
        leadSource: sp.leadSource ?? "all",
        agentIds:   sp.agentIds   ? sp.agentIds.split(",") : [],
        companyId:  sp.companyId  ?? "all",
        view:       sp.view       ?? "company",
      }}
    />
  );
}
