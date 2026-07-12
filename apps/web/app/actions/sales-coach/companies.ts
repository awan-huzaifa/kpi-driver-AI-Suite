"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("access_role")
    .eq("id", user.id)
    .single();

  if (profile?.access_role !== "super_admin") throw new Error("Forbidden");
}

export async function createCompany(data: {
  name:                string;
  ghl_sub_account_id?: string;
}) {
  await assertSuperAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("companies").insert({
    name:               data.name.trim(),
    ghl_sub_account_id: data.ghl_sub_account_id?.trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/sales-coach/super-admin/companies");
}

export async function deleteCompany(id: string) {
  await assertSuperAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("companies").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sales-coach/super-admin/companies");
}
