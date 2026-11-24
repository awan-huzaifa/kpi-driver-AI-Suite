import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ReportsClient from "./reports-client";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.access_role === "user") redirect("/sales-coach");

  const admin = createAdminClient();

  let query = admin
    .from("sent_reports")
    .select("id, company_id, recipient_user_id, recipient_email, app, variant, subject, period_label, period_from, period_to, sent_at")
    .order("sent_at", { ascending: false })
    .limit(500);

  if (profile.access_role === "admin" && profile.company_id) {
    query = query.eq("company_id", profile.company_id);
  }

  const { data: reports } = await query;

  let companies: { id: string; name: string }[] = [];
  if (profile.access_role === "super_admin") {
    const { data: cos } = await admin.from("companies").select("id, name").order("name");
    companies = cos ?? [];
  }

  return (
    <ReportsClient
      reports={reports ?? []}
      companies={companies}
      accessRole={profile.access_role ?? "user"}
    />
  );
}
