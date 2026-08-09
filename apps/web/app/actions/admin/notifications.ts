"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccessRole } from "@/types/database";

async function getCallerProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  return profile as { id: string; access_role: AccessRole; company_id: string | null };
}

// Admin updates their OWN notification prefs (respects locked)
export async function updateMyNotifications(prefs: {
  notify_reports?: boolean;
  notify_billing?: boolean;
}) {
  const caller  = await getCallerProfile();
  const supabase = await createClient();

  // Fetch current locked state to avoid overriding super-admin locks
  const { data: current } = await supabase
    .from("users")
    .select("notify_reports_locked, notify_billing_locked")
    .eq("id", caller.id)
    .single();

  const updates: Record<string, boolean> = {};

  if (prefs.notify_reports !== undefined && !current?.notify_reports_locked) {
    updates.notify_reports = prefs.notify_reports;
  }
  if (prefs.notify_billing !== undefined && !current?.notify_billing_locked) {
    updates.notify_billing = prefs.notify_billing;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", caller.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/notifications");
}

// Super admin sets notification prefs for any user, with locking semantics:
// turning OFF → locked=true (admin cannot re-enable)
// turning ON  → locked=false (admin can manage again)
export async function setSuperAdminNotifications(userId: string, prefs: {
  notify_reports?: boolean;
  notify_billing?: boolean;
}) {
  const caller = await getCallerProfile();
  if (caller.access_role !== "super_admin") throw new Error("Forbidden");

  const admin   = createAdminClient();
  const updates: Record<string, boolean> = {};

  if (prefs.notify_reports !== undefined) {
    updates.notify_reports        = prefs.notify_reports;
    updates.notify_reports_locked = !prefs.notify_reports;
  }
  if (prefs.notify_billing !== undefined) {
    updates.notify_billing        = prefs.notify_billing;
    updates.notify_billing_locked = !prefs.notify_billing;
  }

  const { error } = await admin.from("users").update(updates).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}
