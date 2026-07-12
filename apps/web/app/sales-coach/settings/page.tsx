import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, phone, access_role")
    .eq("id", user.id)
    .single();

  const accessRole = profile?.access_role ?? "user";

  // Fetch digest preferences only for admins (requires migration 0005 to be run)
  let digestPreferences = { enabled: true, periods: ["weekly"] as string[] };
  if (accessRole === "admin") {
    const { data: prefs } = await supabase
      .from("users")
      .select("digest_preferences")
      .eq("id", user.id)
      .single();
    if (prefs?.digest_preferences) digestPreferences = prefs.digest_preferences;
  }

  return (
    <SettingsClient
      email={user.email ?? ""}
      fullName={profile?.full_name ?? ""}
      phone={profile?.phone ?? ""}
      accessRole={accessRole}
      digestPreferences={digestPreferences}
    />
  );
}
