import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import NoteTakerClient from "./note-taker-client";

export default async function NoteTakerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id, notify_billing")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();

  let query = admin
    .from("note_taker_calls")
    .select("id, company_id, call_direction, to_number, from_number, contact_name, contact_phone, agent_phone, agent_name, agent_type, duration_sec, stage, lead_source, crm_link, custom_fields, recording_url, input_tokens, output_tokens, cost_usd, created_at")
    .order("created_at", { ascending: false });

  if (profile?.access_role === "super_admin") {
    // super_admin sees all
  } else if (profile?.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else {
    // no company — no results
    return (
      <NoteTakerClient
        calls={[]}
        totalCalls={0}
        companies={[]}
        accessRole={profile?.access_role ?? "user"}
        showCost={false}
      />
    );
  }

  const { data: calls } = await query;

  let countQuery = admin
    .from("note_taker_calls")
    .select("id", { count: "exact", head: true });
  if (profile?.access_role !== "super_admin" && profile?.company_id) {
    countQuery = countQuery.eq("company_id", profile.company_id);
  }
  const { count: totalCalls } = await countQuery;

  let companies: { id: string; name: string }[] = [];
  if (profile?.access_role === "super_admin") {
    const { data: cos } = await admin.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }

  return (
    <NoteTakerClient
      calls={calls ?? []}
      totalCalls={totalCalls ?? 0}
      companies={companies}
      accessRole={profile?.access_role ?? "user"}
      showCost={profile?.access_role === "super_admin" || (profile?.access_role === "admin" && (profile?.notify_billing ?? false))}
    />
  );
}
