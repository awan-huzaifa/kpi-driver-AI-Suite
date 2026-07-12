"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccessRole, AgentType } from "@/types/database";

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

export interface InviteUserData {
  email:              string;
  full_name:          string;
  role:               "user" | "admin";
  agent_type:         AgentType;
  app_underwriting:   boolean;
  app_sales_coach:    boolean;
  app_training_coach: boolean;
  app_note_taker:     boolean;
  app_data_enrichment: boolean;
  app_skip_tracing:   boolean;
  company_id?:        string;
}

export async function inviteUser(data: InviteUserData) {
  const caller = await getCallerProfile();

  const companyId =
    caller.access_role === "super_admin"
      ? data.company_id?.trim() || null
      : caller.company_id;

  if (!companyId) {
    throw new Error(
      caller.access_role === "super_admin"
        ? "Please select a company to assign this user to."
        : "Your account is not assigned to a company.",
    );
  }

  const admin = createAdminClient();

  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    data.email.trim(),
    { redirectTo: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" },
  );
  if (inviteErr) throw new Error(inviteErr.message);
  if (!invite.user) throw new Error("Failed to create user.");

  const { error: profileErr } = await admin.from("users").upsert(
    {
      id:                 invite.user.id,
      email:              data.email.trim(),
      full_name:          data.full_name.trim() || null,
      company_id:         companyId,
      access_role:        data.role,
      agent_type:         data.agent_type,
      app_underwriting:   data.app_underwriting,
      app_sales_coach:    data.app_sales_coach,
      app_training_coach: data.app_training_coach,
      app_note_taker:      data.app_note_taker,
      app_data_enrichment: data.app_data_enrichment,
      app_skip_tracing:    data.app_skip_tracing,
      is_active:           true,
    },
    { onConflict: "id" },
  );
  if (profileErr) throw new Error(profileErr.message);

  revalidatePath("/admin/users");
}

export interface UpdateUserData {
  role:               "user" | "admin";
  agent_type:         AgentType;
  app_underwriting:   boolean;
  app_sales_coach:    boolean;
  app_training_coach: boolean;
  app_note_taker:      boolean;
  app_data_enrichment: boolean;
  app_skip_tracing:    boolean;
}

export async function updateUser(userId: string, data: UpdateUserData) {
  const caller = await getCallerProfile();
  const admin = createAdminClient();

  let query = admin.from("users").update({
    access_role:        data.role,
    agent_type:         data.agent_type,
    app_underwriting:   data.app_underwriting,
    app_sales_coach:    data.app_sales_coach,
    app_training_coach: data.app_training_coach,
    app_note_taker:      data.app_note_taker,
    app_data_enrichment: data.app_data_enrichment,
    app_skip_tracing:    data.app_skip_tracing,
  }).eq("id", userId);

  if (caller.access_role === "admin") {
    query = query.eq("company_id", caller.company_id!);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

export async function removeUser(userId: string) {
  const caller = await getCallerProfile();
  const admin = createAdminClient();

  let query = admin.from("users").update({ is_active: false }).eq("id", userId);
  if (caller.access_role === "admin") {
    query = query.eq("company_id", caller.company_id!);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}
