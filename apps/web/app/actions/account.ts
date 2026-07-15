"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(data: { full_name?: string; avatar_url?: string }) {
  // Verify identity with user-scoped client first
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const patch: Record<string, string | null> = {};
  if (data.full_name  !== undefined) patch.full_name  = data.full_name.trim() || null;
  if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url;

  // Use admin client to bypass the SELECT-only RLS on users table
  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update(patch)
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/account");
}
