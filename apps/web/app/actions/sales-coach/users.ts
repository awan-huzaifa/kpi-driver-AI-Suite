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
  return profile as { access_role: AccessRole; company_id: string | null };
}

// ── Invite ────────────────────────────────────────────────────────────────────

export async function inviteUser(data: {
  email:       string;
  full_name:   string;
  phone?:      string;
  access_role: AccessRole;
  agent_type:  AgentType;
  company_id?: string;
}) {
  const caller = await getCallerProfile();

  if (caller.access_role === "admin") {
    // Admins may only invite 'user' role into their own company
    if (data.access_role !== "user") throw new Error("Admins can only invite users with 'user' role.");
    data.company_id = caller.company_id ?? undefined;
  } else if (caller.access_role !== "super_admin") {
    throw new Error("Forbidden");
  }

  const admin = createAdminClient();

  // Check for duplicate email
  const { data: existingEmail } = await admin
    .from("users")
    .select("id")
    .eq("email", data.email.trim())
    .maybeSingle();
  if (existingEmail) throw new Error("A user with this email already exists.");

  // Check for duplicate phone
  if (data.phone?.trim()) {
    const { data: existingPhone } = await admin
      .from("users")
      .select("id")
      .eq("phone", data.phone.trim())
      .maybeSingle();
    if (existingPhone) throw new Error("A user with this phone number already exists.");
  }

  const { data: authUser, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    data.email,
    { data: { full_name: data.full_name } }
  );
  if (inviteErr) throw new Error(inviteErr.message);

  // Trigger creates public.users row; upsert with correct values
  const { error: upsertErr } = await admin.from("users").upsert({
    id:          authUser.user.id,
    email:       data.email,
    full_name:   data.full_name,
    phone:       data.phone?.trim() || null,
    access_role: data.access_role,
    agent_type:  data.agent_type,
    company_id:  data.company_id || null,
  });
  if (upsertErr) throw new Error(upsertErr.message);

  revalidatePath("/sales-coach/super-admin/users");
  revalidatePath("/sales-coach/admin/users");
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateUser(
  targetId: string,
  data: { access_role?: AccessRole; agent_type?: AgentType; company_id?: string | null }
) {
  const caller  = await getCallerProfile();
  const admin   = createAdminClient();

  if (caller.access_role === "super_admin") {
    const { error } = await admin.from("users").update(data).eq("id", targetId);
    if (error) throw new Error(error.message);
  } else if (caller.access_role === "admin") {
    // Admin can only update agent_type of users in their company
    const { error } = await admin
      .from("users")
      .update({ agent_type: data.agent_type })
      .eq("id", targetId)
      .eq("company_id", caller.company_id!);
    if (error) throw new Error(error.message);
  } else {
    throw new Error("Forbidden");
  }

  revalidatePath("/sales-coach/super-admin/users");
  revalidatePath("/sales-coach/admin/users");
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteUser(targetId: string) {
  const caller = await getCallerProfile();
  if (caller.access_role !== "super_admin") throw new Error("Forbidden");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) throw new Error(error.message);

  revalidatePath("/sales-coach/super-admin/users");
}

// ── Deactivate / Reactivate ───────────────────────────────────────────────────

export async function setUserActive(targetId: string, active: boolean) {
  const caller = await getCallerProfile();
  if (!["super_admin", "admin"].includes(caller.access_role)) throw new Error("Forbidden");

  const admin = createAdminClient();

  const [{ error: banErr }, { error: dbErr }] = await Promise.all([
    admin.auth.admin.updateUserById(targetId, {
      ban_duration: active ? "none" : "87600h",
    }),
    admin.from("users").update({ is_active: active }).eq("id", targetId),
  ]);

  if (banErr)  throw new Error(banErr.message);
  if (dbErr)   throw new Error(dbErr.message);

  revalidatePath("/sales-coach/super-admin/users");
  revalidatePath("/sales-coach/admin/users");
}
