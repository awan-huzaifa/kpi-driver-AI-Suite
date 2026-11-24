import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TrainingCoachClient from "./training-coach-client";

export default async function TrainingCoachPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id, notify_billing")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = profile?.access_role === "super_admin";
  const db = isSuperAdmin ? createAdminClient() : supabase;

  let query = db
    .from("training_calls")
    .select(`*, agent:users(full_name, agent_type), ai_agent:training_ai_agents(agent_name)`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (profile?.access_role === "admin" && profile.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else if (profile?.access_role === "user" && profile?.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else if (profile?.access_role === "user") {
    query = query.eq("user_id", profile.id);
  }
  // super_admin: no filter — sees all calls

  const { data: calls } = await query;

  let companies: { id: string; name: string }[] = [];
  if (isSuperAdmin) {
    const admin = createAdminClient();
    const { data: cos } = await admin.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }

  return (
    <TrainingCoachClient
      calls={calls ?? []}
      companies={companies}
      accessRole={profile?.access_role ?? "user"}
      currentUserId={profile?.id}
      showCost={profile?.access_role === "super_admin" || (profile?.access_role === "admin" && (profile?.notify_billing ?? false))}
    />
  );
}
