"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@kpidriver/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

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

/** Upsert a billing_config row for a specific company+app. */
async function upsertBillingRow(
  admin: AdminClient,
  app: string,
  companyId: string,
  data: Record<string, unknown>,
) {
  const { data: existing } = await admin
    .from("billing_config")
    .select("id")
    .eq("app", app)
    .eq("company_id", companyId)
    .maybeSingle();

  const payload = { ...data, updated_at: new Date().toISOString() };

  if (existing) {
    const { error } = await admin.from("billing_config").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("billing_config").insert({ app, company_id: companyId, ...payload });
    if (error) throw new Error(error.message);
  }
}

/** Upsert a multiplier for a given app.
 *  companyId = null  → update the global default row.
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
  const data = { multiplier };

  if (!companyId) {
    const { error } = await admin
      .from("billing_config")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("app", app)
      .is("company_id", null);
    if (error) throw new Error(error.message);
  } else {
    await upsertBillingRow(admin, app, companyId, data);
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

export async function updateUnderwritingPricing(
  rentcastChargedUsd:      number,
  axessoChargedUsd:        number,
  claudeInputChargedPerM:  number,
  claudeOutputChargedPerM: number,
  companyId: string | null = null,
) {
  await requireSuperAdmin();
  if ([rentcastChargedUsd, axessoChargedUsd, claudeInputChargedPerM, claudeOutputChargedPerM].some(v => v < 0))
    throw new Error("Charged prices cannot be negative");

  const admin = createAdminClient();
  const data = {
    rentcast_charged_usd:        rentcastChargedUsd,
    axesso_charged_usd:          axessoChargedUsd,
    claude_input_charged_per_m:  claudeInputChargedPerM,
    claude_output_charged_per_m: claudeOutputChargedPerM,
  };

  if (!companyId) {
    const { error } = await admin.from("billing_config").update({ ...data, updated_at: new Date().toISOString() }).eq("app", "underwriting").is("company_id", null);
    if (error) throw new Error(error.message);
  } else {
    await upsertBillingRow(admin, "underwriting", companyId, data);
  }

  revalidatePath("/super-admin/billing-config");
}

export async function updateClaudeOnlyPricing(
  app: string,
  inputChargedPerM:  number,
  outputChargedPerM: number,
  companyId: string | null = null,
) {
  await requireSuperAdmin();
  if (inputChargedPerM < 0 || outputChargedPerM < 0) throw new Error("Charged prices cannot be negative");

  const admin = createAdminClient();
  const data = {
    claude_input_charged_per_m:  inputChargedPerM,
    claude_output_charged_per_m: outputChargedPerM,
  };

  if (!companyId) {
    const { error } = await admin.from("billing_config").update({ ...data, updated_at: new Date().toISOString() }).eq("app", app).is("company_id", null);
    if (error) throw new Error(error.message);
  } else {
    await upsertBillingRow(admin, app, companyId, data);
  }

  revalidatePath("/super-admin/billing-config");
}

export async function updateTrainingCoachPricing(
  assistableChargedPerMin: number,
  claudeInputChargedPerM:  number,
  claudeOutputChargedPerM: number,
  companyId: string | null = null,
) {
  await requireSuperAdmin();
  if ([assistableChargedPerMin, claudeInputChargedPerM, claudeOutputChargedPerM].some(v => v < 0))
    throw new Error("Charged prices cannot be negative");

  const admin = createAdminClient();
  const data = {
    assistable_charged_per_min:  assistableChargedPerMin,
    claude_input_charged_per_m:  claudeInputChargedPerM,
    claude_output_charged_per_m: claudeOutputChargedPerM,
  };

  if (!companyId) {
    const { error } = await admin.from("billing_config").update({ ...data, updated_at: new Date().toISOString() }).eq("app", "training_coach").is("company_id", null);
    if (error) throw new Error(error.message);
  } else {
    await upsertBillingRow(admin, "training_coach", companyId, data);
  }

  revalidatePath("/super-admin/billing-config");
}

export async function updateSkipTracingPricing(
  normalCharged:   number,
  advancedCharged: number,
  apnCharged:      number,
  dncCharged:      number,
  companyId: string | null = null,
) {
  await requireSuperAdmin();
  if ([normalCharged, advancedCharged, apnCharged, dncCharged].some(v => v < 0))
    throw new Error("Charged prices cannot be negative");

  const admin = createAdminClient();
  const data = {
    st_charged_normal_usd:   normalCharged,
    st_charged_advanced_usd: advancedCharged,
    st_charged_apn_usd:      apnCharged,
    st_charged_dnc_usd:      dncCharged,
  };

  if (!companyId) {
    const { error } = await admin.from("billing_config").update({ ...data, updated_at: new Date().toISOString() }).eq("app", "skip_tracing").is("company_id", null);
    if (error) throw new Error(error.message);
  } else {
    await upsertBillingRow(admin, "skip_tracing", companyId, data);
  }

  revalidatePath("/super-admin/billing-config");
}

export async function updateNoteTakerPricing(
  whisperChargedPerMin:  number,
  gptInputChargedPerM:   number,
  gptOutputChargedPerM:  number,
  companyId: string | null = null,
) {
  await requireSuperAdmin();
  if ([whisperChargedPerMin, gptInputChargedPerM, gptOutputChargedPerM].some(v => v < 0))
    throw new Error("Charged prices cannot be negative");

  const admin = createAdminClient();
  const data = {
    nt_whisper_charged_per_min:  whisperChargedPerMin,
    nt_gpt_input_charged_per_m:  gptInputChargedPerM,
    nt_gpt_output_charged_per_m: gptOutputChargedPerM,
  };

  if (!companyId) {
    const { error } = await admin.from("billing_config").update({ ...data, updated_at: new Date().toISOString() }).eq("app", "note_taker").is("company_id", null);
    if (error) throw new Error(error.message);
  } else {
    await upsertBillingRow(admin, "note_taker", companyId, data);
  }

  revalidatePath("/super-admin/billing-config");
}

export async function updateDataEnrichmentPricing(
  chargedPerCall: number,
  companyId: string | null = null,
  providerRateUsd?: number,
) {
  await requireSuperAdmin();
  if (chargedPerCall < 0) throw new Error("Charged price cannot be negative");
  if (providerRateUsd !== undefined && providerRateUsd < 0) throw new Error("Provider rate cannot be negative");

  const admin = createAdminClient();
  const data: Record<string, unknown> = { de_charged_per_call_usd: chargedPerCall };

  if (!companyId) {
    if (providerRateUsd !== undefined) data.axesso_cost_usd = providerRateUsd;
    const { error } = await admin.from("billing_config").update({ ...data, updated_at: new Date().toISOString() }).eq("app", "data_enrichment").is("company_id", null);
    if (error) throw new Error(error.message);
  } else {
    await upsertBillingRow(admin, "data_enrichment", companyId, data);
  }

  revalidatePath("/super-admin/billing-config");
}

/** Remove a company-specific override so that company falls back to the global default. */
export async function clearCompanyPricing(app: string, companyId: string) {
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

/** Save provider (API vendor) rates for an app — global row only. */
export async function saveProviderRates(app: string, rates: Record<string, number>) {
  await requireSuperAdmin();
  for (const v of Object.values(rates)) {
    if (v < 0) throw new Error("Provider rates cannot be negative");
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("billing_config")
    .update({ ...rates, updated_at: new Date().toISOString() })
    .eq("app", app)
    .is("company_id", null);
  if (error) throw new Error(error.message);
  revalidatePath("/super-admin/billing-config");
}

/** @deprecated use clearCompanyPricing */
export const clearCompanyMultiplier = clearCompanyPricing;
