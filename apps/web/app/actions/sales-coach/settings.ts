"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

export async function updateProfile(data: { full_name: string; phone: string }) {
  const { user } = await getAuthUser();
  const admin     = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({
      full_name: data.full_name.trim() || null,
      phone:     data.phone.trim()     || null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/sales-coach/settings");
}

export async function updatePassword(data: { currentPassword: string; newPassword: string }) {
  const { supabase, user } = await getAuthUser();

  // Verify current password
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email:    user.email!,
    password: data.currentPassword,
  });
  if (verifyErr) throw new Error("Current password is incorrect.");

  // Update to new password
  const { error: updateErr } = await supabase.auth.updateUser({ password: data.newPassword });
  if (updateErr) throw new Error(updateErr.message);
}

export async function updateDigestPreferences(data: { enabled: boolean; periods: string[] }) {
  const { user } = await getAuthUser();
  const admin     = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({ digest_preferences: data })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/sales-coach/settings");
}
