import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AnalyticsClient from "./analytics-client";
import type { AccessRole } from "@/types/database";

export type TrainingAnalyticsCall = {
  id:           string;
  user_id:      string;
  company_id:   string;
  score:        number | null;
  scorable:     boolean;
  direction:    "inbound" | "outbound" | null;
  duration_sec: number | null;
  created_at:   string;
  evaluation:   Record<string, any> | null;
  agent:        { full_name: string | null; agent_type: string } | null;
  ai_agent:     { agent_name: string } | null;
};

export default async function TrainingAnalyticsPage() {
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

  const admin = createAdminClient();

  let query = admin
    .from("training_calls")
    .select("id, user_id, company_id, score, scorable, direction, duration_sec, created_at, evaluation, agent:users(full_name, agent_type), ai_agent:training_ai_agents(agent_name)")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (role === "admin" || role === "user") {
    if (companyId) query = query.eq("company_id", companyId);
    else           query = query.eq("user_id", profile!.id);
  }

  const { data: calls } = await query;

  let companies: { id: string; name: string }[] = [];
  if (role === "super_admin") {
    const { data: cos } = await admin.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }

  return (
    <AnalyticsClient
      calls={(calls ?? []) as TrainingAnalyticsCall[]}
      companies={companies}
      accessRole={role}
      currentUserId={profile?.id}
    />
  );
}
