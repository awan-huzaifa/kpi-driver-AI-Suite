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
  return profile as { access_role: AccessRole; company_id: string | null };
}

export async function createAiAgent(data: {
  agent_name:        string;
  phone_number:      string;
  description?:      string;
  external_agent_id?: string;
  company_id?:       string;
}) {
  const caller = await getCallerProfile();

  if (caller.access_role !== "super_admin") throw new Error("Forbidden");
  const companyId: string | null = data.company_id || null;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("training_ai_agents")
    .select("id")
    .eq("phone_number", data.phone_number.trim())
    .maybeSingle();
  if (existing) throw new Error("An AI agent with this phone number already exists.");

  const { error } = await admin.from("training_ai_agents").insert({
    company_id:        companyId,
    agent_name:        data.agent_name.trim(),
    phone_number:      data.phone_number.trim(),
    description:       data.description?.trim() || null,
    external_agent_id: data.external_agent_id?.trim() || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/training-coach/agents");
}

export async function deleteAiAgent(id: string) {
  const caller = await getCallerProfile();
  if (caller.access_role !== "super_admin") throw new Error("Forbidden");

  const admin = createAdminClient();
  const { error } = await admin.from("training_ai_agents").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/training-coach/agents");
}
