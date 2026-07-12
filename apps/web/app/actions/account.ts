"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(data: { full_name: string; phone: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("users")
    .update({
      full_name: data.full_name.trim() || null,
      phone:     data.phone.trim()     || null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/account");
}
