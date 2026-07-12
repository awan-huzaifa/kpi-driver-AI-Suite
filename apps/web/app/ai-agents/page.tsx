import { redirect } from "next/navigation";
import { createClient } from "@kpidriver/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AiAgentsFrame from "./ai-agents-frame";

export default async function AiAgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  let locationId: string | null = null;
  if (profile?.company_id) {
    const admin = createAdminClient();
    const { data: company } = await admin
      .from("companies")
      .select("ghl_sub_account_id")
      .eq("id", profile.company_id)
      .single();
    locationId = company?.ghl_sub_account_id ?? null;
  }

  const src = locationId
    ? `https://createassistants.com/app?owner=UZzSUQbisGjuNqYaGbEpOJ9s&locationid=${encodeURIComponent(locationId)}`
    : null;

  return <AiAgentsFrame src={src} />;
}
