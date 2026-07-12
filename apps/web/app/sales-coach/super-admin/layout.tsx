import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// NOTE: this layout is nested inside app/sales-coach/layout.tsx, which already
// renders the Sidebar + ContentShell for every /sales-coach/* route — including
// this one. Don't render them again here, or you get a duplicated shell.
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("access_role")
    .eq("id", user.id)
    .single();

  if (profile?.access_role !== "super_admin") redirect("/sales-coach");

  return <>{children}</>;
}
