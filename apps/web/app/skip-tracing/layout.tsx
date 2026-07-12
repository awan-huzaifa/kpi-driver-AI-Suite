import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlatformSidebar from "@/components/platform/PlatformSidebar";
import ContentShell from "@/components/skip-tracing/layout/ContentShell";
import type { Access } from "@/components/platform/app-data";

export default async function SkipTracingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, access_role, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.access_role === "admin" || profile?.access_role === "super_admin";
  const access: Access = {
    underwriting:   isAdmin || (profile?.app_underwriting   ?? false),
    salesCoach:     isAdmin || (profile?.app_sales_coach    ?? false),
    trainingCoach:  isAdmin || (profile?.app_training_coach ?? false),
    noteTaker:      isAdmin || (profile?.app_note_taker     ?? false),
    dataEnrichment: isAdmin || (profile?.app_data_enrichment ?? false),
    skipTracing:    isAdmin || (profile?.app_skip_tracing   ?? false),
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0D1C2A" }}>
      <PlatformSidebar
        user={{ email: profile?.email ?? user.email ?? "", fullName: profile?.full_name ?? null }}
        access={access}
        accessRole={profile?.access_role}
      />
      <ContentShell>{children}</ContentShell>
    </div>
  );
}
