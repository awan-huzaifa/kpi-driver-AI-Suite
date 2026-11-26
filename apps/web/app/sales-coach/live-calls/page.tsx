import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LiveCallsClient from "./live-calls-client";
import { getMyDisputeMap } from "@/app/actions/sales-coach/disputes";

export default async function LiveCallsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id, notify_billing")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("live_calls")
    .select(`id, user_id, company_id, contact_name, contact_phone, agent_phone, direction, duration_sec, call_stage, scorable, score, call_result, recording_url, crm_link, cost_usd, evaluation, created_at, agent:users(full_name, agent_type, access_role)`)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (profile?.access_role === "admin" && profile.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else if (profile?.access_role === "user" && profile?.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else if (profile?.access_role === "user") {
    query = query.eq("user_id", profile.id);
  }

  const { data: calls } = await query;

  let countQuery = supabase
    .from("live_calls")
    .select("id", { count: "exact", head: true });
  if (profile?.access_role === "admin" && profile.company_id) {
    countQuery = countQuery.eq("company_id", profile.company_id);
  } else if (profile?.access_role === "user" && profile?.company_id) {
    countQuery = countQuery.eq("company_id", profile.company_id);
  } else if (profile?.access_role === "user") {
    countQuery = countQuery.eq("user_id", profile.id);
  }
  const { count: totalCalls } = await countQuery;

  let companies: { id: string; name: string }[] = [];
  if (profile?.access_role === "super_admin") {
    const admin = createAdminClient();
    const { data: cos } = await admin.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }
  const disputedCallMap = await getMyDisputeMap(user.id);

  return (
    <LiveCallsClient
      calls={calls ?? []}
      totalCalls={totalCalls ?? 0}
      companies={companies}
      accessRole={profile?.access_role ?? "user"}
      showCost={profile?.access_role === "super_admin" || (profile?.access_role === "admin" && (profile?.notify_billing ?? false))}
      currentUserId={user.id}
      disputedCallMap={disputedCallMap}
    />
  );
}
