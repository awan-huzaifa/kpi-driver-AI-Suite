import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PrintClient from "./print-client";
import type { AccessRole } from "@/types/database";

export default async function TCAnalyticsPrintPage({
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

  const admin = createAdminClient();

  let query = admin
    .from("training_calls")
    .select("user_id, company_id, score, scorable, direction, call_result, duration_sec, created_at, evaluation, agent:users(full_name, agent_type), ai_agent:training_ai_agents(agent_name)")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (role === "admin") {
    if (companyId) query = query.eq("company_id", companyId);
  } else if (role === "user") {
    query = query.eq("user_id", profile!.id);
  }

  const { data: calls } = await query;
  const sp = await searchParams;

  return (
    <PrintClient
      calls={(calls ?? []) as any}
      accessRole={role}
      currentUserId={profile?.id ?? ""}
      filters={{
        period:    sp.period    ?? "all",
        from:      sp.from      ?? "",
        to:        sp.to        ?? "",
        direction: sp.direction ?? "all",
        duration:  sp.duration  ?? "all",
        role:      sp.role      ?? "all",
        scorable:  sp.scorable  ?? "all",
        aiAgent:   sp.aiAgent   ?? "all",
        agentIds:  sp.agentIds  ? sp.agentIds.split(",") : [],
        companyId: sp.companyId ?? "all",
      }}
    />
  );
}
