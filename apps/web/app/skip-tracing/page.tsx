import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SkipTracingClient from "./skip-tracing-client";

export default async function SkipTracingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();

  let query = admin
    .from("skip_tracing_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (profile?.access_role === "super_admin") {
    // super_admin sees all companies
  } else if (profile?.company_id) {
    query = query.eq("company_id", profile.company_id);
  } else {
    return <SkipTracingClient logs={[]} accessRole={profile?.access_role ?? "user"} />;
  }

  const { data: logs } = await query;

  let companies: { id: string; name: string }[] = [];
  if (profile?.access_role === "super_admin") {
    const { data: cos } = await admin.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }

  return (
    <SkipTracingClient
      logs={logs ?? []}
      companies={companies}
      accessRole={profile?.access_role ?? "user"}
    />
  );
}
