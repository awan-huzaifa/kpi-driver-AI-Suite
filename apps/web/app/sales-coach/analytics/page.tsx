import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnalyticsClient from "./analytics-client";
import type { AccessRole } from "@/types/database";

export type AnalyticsCall = {
  user_id:    string;
  company_id: string;
  score:      number | null;
  scorable:   boolean;
  direction:  "inbound" | "outbound";
  call_result: string | null;
  duration_sec: number | null;
  created_at: string;
  evaluation: {
    opportunity_level?:     "low" | "medium" | "high" | null;
    manager_review_needed?: boolean;
    meta?: { lead_source?: string | null } | null;
  } | null;
  agent: { full_name: string | null; agent_type: string } | null;
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id, agent_type")
    .eq("id", user.id)
    .single();

  const role      = (profile?.access_role ?? "user") as AccessRole;
  const companyId = profile?.company_id ?? "";

  let query = supabase
    .from("live_calls")
    .select("user_id, company_id, score, scorable, direction, call_result, duration_sec, created_at, evaluation, agent:users(full_name, agent_type)")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (role === "admin" || role === "user") {
    if (companyId) query = query.eq("company_id", companyId);
    else           query = query.eq("user_id", profile!.id);
  }

  const { data: calls } = await query;

  let companies: { id: string; name: string }[] = [];
  if (role === "super_admin") {
    const { data: cos } = await supabase.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }

  return (
    <AnalyticsClient
      calls={(calls ?? []) as AnalyticsCall[]}
      companies={companies}
      accessRole={role}
      currentUserId={profile?.id}
      currentUserAgentType={profile?.agent_type ?? null}
    />
  );
}
