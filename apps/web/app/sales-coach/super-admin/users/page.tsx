import { createClient } from "@/lib/supabase/server";
import SuperAdminUsersClient from "./users-client";

export default async function SuperAdminUsersPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: companies }] = await Promise.all([
    supabase
      .from("users")
      .select("*, companies(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("companies")
      .select("id, name")
      .order("name"),
  ]);

  return (
    <SuperAdminUsersClient
      users={users ?? []}
      companies={companies ?? []}
    />
  );
}
