"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
