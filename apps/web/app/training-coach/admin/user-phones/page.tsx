import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import UserPhonesClient from "./user-phones-client";

export default async function UserPhonesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("access_role")
    .eq("id", user.id)
    .single();

  if (profile?.access_role !== "super_admin") redirect("/training-coach");

  const admin = createAdminClient();

  const [{ data: companies }, { data: users }, { data: phones }] = await Promise.all([
    admin.from("companies").select("id, name").order("name"),
    admin.from("users").select("id, full_name, company_id, agent_type").eq("is_active", true).order("full_name"),
    admin.from("user_phones").select("id, user_id, phone"),
  ]);

  return (
    <UserPhonesClient
      companies={companies ?? []}
      users={users ?? []}
      phones={phones ?? []}
    />
  );
}
