"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireSuperAdmin() {
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

/** Upsert a multiplier for a given app.
 *  companyId = null  → update the global default row (company_id IS NULL).
 *  companyId = uuid  → insert or update a company-specific override row.
 */
export async function updateBillingMultiplier(
  app: string,
  multiplier: number,
  companyId: string | null,
) {
  await requireSuperAdmin();
  if (multiplier < 1 || multiplier > 100) throw new Error("Multiplier must be between 1 and 100");

  const admin = createAdminClient();

  if (!companyId) {
    // Update global default
    const { error } = await admin
      .from("billing_config")
      .update({ multiplier, updated_at: new Date().toISOString() })
      .eq("app", app)
      .is("company_id", null);
    if (error) throw new Error(error.message);
  } else {
    // Check if an override already exists for this company+app
    const { data: existing } = await admin
      .from("billing_config")
      .select("id")
      .eq("app", app)
      .eq("company_id", companyId)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("billing_config")
        .update({ multiplier, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin
        .from("billing_config")
        .insert({ app, multiplier, company_id: companyId, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/super-admin/billing-config");
}

/** Update hardcoded API costs for underwriting (global row only). */
export async function updateApiCosts(rentcastCostUsd: number, axessoCostUsd: number) {
  await requireSuperAdmin();
  if (rentcastCostUsd < 0 || axessoCostUsd < 0) throw new Error("Costs cannot be negative");

  const admin = createAdminClient();
  const { error } = await admin
    .from("billing_config")
    .update({ rentcast_cost_usd: rentcastCostUsd, axesso_cost_usd: axessoCostUsd, updated_at: new Date().toISOString() })
    .eq("app", "underwriting")
    .is("company_id", null);

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/billing-config");
}

/** Remove a company-specific override so that company falls back to the global default. */
export async function clearCompanyMultiplier(app: string, companyId: string) {
  await requireSuperAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from("billing_config")
    .delete()
    .eq("app", app)
    .eq("company_id", companyId);

  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/billing-config");
}
