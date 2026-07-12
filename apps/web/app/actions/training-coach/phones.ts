"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function addPhone(phone: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const trimmed = phone.trim();
  if (!trimmed) throw new Error("Phone number is required.");

  const { error } = await supabase
    .from("user_phones")
    .insert({ user_id: user.id, phone: trimmed });

  if (error) {
    if (error.code === "23505") throw new Error("That number is already registered to a user.");
    throw new Error(error.message);
  }

  revalidatePath("/training-coach/my-numbers");
}

export async function removePhone(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("user_phones")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/training-coach/my-numbers");
}

export async function addPhoneForUser(userId: string, phone: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: profile } = await supabase.from("users").select("access_role").eq("id", user.id).single();
  if (profile?.access_role !== "super_admin") throw new Error("Unauthorized");

  const trimmed = phone.trim();
  if (!trimmed) throw new Error("Phone number is required.");

  const admin = createAdminClient();
  const { error } = await admin.from("user_phones").insert({ user_id: userId, phone: trimmed });
  if (error) {
    if (error.code === "23505") throw new Error("That number is already registered to a user.");
    throw new Error(error.message);
  }

  revalidatePath("/training-coach/admin/user-phones");
}

export async function removePhoneAdmin(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: profile } = await supabase.from("users").select("access_role").eq("id", user.id).single();
  if (profile?.access_role !== "super_admin") throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { error } = await admin.from("user_phones").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/training-coach/admin/user-phones");
}
