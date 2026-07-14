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
    .select("access_role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  if (!["admin", "super_admin"].includes(profile.access_role)) throw new Error("Forbidden");
  return profile as { access_role: AccessRole; company_id: string | null };
}

export async function updateCompany(data: { name: string; ghl_sub_account_id: string }) {
  const caller = await getCallerProfile();
  if (!caller.company_id) throw new Error("Your account is not assigned to a company.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({
      name:               data.name.trim(),
      ghl_sub_account_id: data.ghl_sub_account_id.trim() || null,
    })
    .eq("id", caller.company_id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/company");
}

export async function saveCompanyLogo(logoUrl: string | null) {
  const caller = await getCallerProfile();
  if (!caller.company_id) throw new Error("Your account is not assigned to a company.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({ logo_url: logoUrl })
    .eq("id", caller.company_id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/company");
}
