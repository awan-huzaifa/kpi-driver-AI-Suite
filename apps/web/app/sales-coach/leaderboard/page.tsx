import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeaderboardClient from "./leaderboard-client";
import type { AccessRole } from "@/types/database";

export type LeaderboardCall = {
  user_id:    string;
  company_id: string;
  score:      number;
  created_at: string;
  evaluation: { core_score?: number | null } | null;
  agent:      { full_name: string | null; agent_type: string; avatar_url: string | null } | null;
};

export default async function LeaderboardPage() {
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
    .select("user_id, company_id, score, evaluation, created_at, agent:users(full_name, agent_type, avatar_url)")
    .eq("scorable", true)
    .not("score", "is", null)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (role === "admin" || role === "user") {
    query = query.eq("company_id", companyId);
  }

  const { data: calls } = await query;

  let companies: { id: string; name: string }[] = [];
  if (role === "super_admin") {
    const { data: cos } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");
    companies = cos ?? [];
  }

  return (
    <LeaderboardClient
      calls={(calls ?? []) as unknown as LeaderboardCall[]}
      companies={companies}
      accessRole={role}
      currentUserId={profile?.id}
    />
  );
}
