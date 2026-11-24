import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DataEnrichmentClient from "./data-enrichment-client";

export default async function DataEnrichmentPage() {
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
    .from("data_enrichment_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (profile?.access_role !== "super_admin") {
    if (!profile?.company_id) {
      return <DataEnrichmentClient logs={[]} companies={[]} accessRole={profile?.access_role ?? "user"} showCost={false} />;
    }
    query = query.eq("company_id", profile.company_id);
  }

  const { data: logs } = await query;

  let companies: { id: string; name: string }[] = [];
  if (profile?.access_role === "super_admin") {
    const { data: cos } = await admin.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }

  return (
    <DataEnrichmentClient
      logs={logs ?? []}
      companies={companies}
      accessRole={profile?.access_role ?? "user"}
      showCost={profile?.access_role === "super_admin" || (profile?.access_role === "admin" && (profile?.notify_billing ?? false))}
    />
  );
}
