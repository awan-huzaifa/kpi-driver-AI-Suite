"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordConsent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ terms_agreed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}
