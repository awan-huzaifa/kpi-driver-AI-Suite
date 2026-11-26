import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Accessible to: QA admins (is_qa = true) and super_admins
export default async function DisputesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("access_role, is_qa")
    .eq("id", user.id)
    .single();

  const canAccess =
    profile?.access_role === "super_admin" ||
    (profile?.access_role === "admin" && profile?.is_qa);

  if (!canAccess) redirect("/sales-coach");

  return <>{children}</>;
}
