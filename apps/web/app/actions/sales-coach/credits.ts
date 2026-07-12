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
  return user.id;
}

export async function addCredits(companyId: string, amount: number) {
  if (amount < 1 || amount > 100_000) throw new Error("Invalid amount");

  const userId = await assertSuperAdmin();
  const admin  = createAdminClient();

  const { error } = await admin.rpc("add_credits", {
    p_company_id: companyId,
    p_amount:     amount,
    p_reason:     "manual_topup",
    p_created_by: userId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/sales-coach/super-admin/companies");
}
