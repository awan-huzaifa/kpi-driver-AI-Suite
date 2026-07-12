import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminUsersClient from "./users-client";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return (
      <div className="px-8 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-sm" style={{ color: "#475569" }}>
          Your account is not assigned to a company yet. Contact a super admin.
        </p>
      </div>
    );
  }

  const { data: users } = await supabase
    .from("users")
    .select("*, companies(name)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  return <AdminUsersClient users={users ?? []} />;
}
