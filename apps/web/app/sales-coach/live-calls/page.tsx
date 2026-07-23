import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LiveCallsClient from "./live-calls-client";

export default async function LiveCallsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("live_calls")
    .select(`*, agent:users(full_name, agent_type, access_role)`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (profile?.access_role === "admin" && profile.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else if (profile?.access_role === "user" && profile?.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else if (profile?.access_role === "user") {
    query = query.eq("user_id", profile.id);
  }

  const { data: calls } = await query;

  let companies: { id: string; name: string }[] = [];
  if (profile?.access_role === "super_admin") {
    const admin = createAdminClient();
    const { data: cos } = await admin.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }

  return (
    <LiveCallsClient
      calls={calls ?? []}
      companies={companies}
      accessRole={profile?.access_role ?? "user"}
    />
  );
}
