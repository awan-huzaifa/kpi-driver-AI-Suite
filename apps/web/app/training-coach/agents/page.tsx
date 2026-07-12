import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AgentsClient from "./agents-client";

export default async function TrainingAgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("access_role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  let agentsQuery = supabase
    .from("training_ai_agents")
    .select("*, companies(name)")
    .order("created_at", { ascending: false });

  // Everyone sees their own company's agents plus globally-shared ones (company_id null).
  // Only super_admin sees across every company.
  if (profile.access_role !== "super_admin") {
    if (!profile.company_id) {
      return (
        <div className="px-8 py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-sm" style={{ color: "#475569" }}>
            Your account is not assigned to a company yet. Contact a super admin.
          </p>
        </div>
      );
    }
    agentsQuery = agentsQuery.or(`company_id.eq.${profile.company_id},company_id.is.null`);
  }

  const { data: agents } = await agentsQuery;

  let companies: { id: string; name: string }[] = [];
  if (profile.access_role === "super_admin") {
    const { data: cos } = await supabase.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }

  return (
    <AgentsClient
      agents={agents ?? []}
      accessRole={profile.access_role}
      companies={companies}
      currentCompanyId={profile.company_id}
    />
  );
}
