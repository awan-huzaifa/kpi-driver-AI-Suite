"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/email/client";

async function getCallerProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("id, access_role, company_id, full_name, email, is_qa")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  return { uid: user.id, ...profile } as {
    uid: string;
    access_role: string;
    company_id: string | null;
    full_name: string | null;
    email: string | null;
    is_qa: boolean;
  };
}

export async function submitDispute(callId: string, category: string, reason: string) {
  const caller = await getCallerProfile();
  if (!caller.company_id) throw new Error("No company assigned");

  const supabase = await createClient();

  // Verify call belongs to this rep and is scorable
  const { data: call } = await supabase
    .from("live_calls")
    .select("id, company_id, scorable, created_at, call_stage, score")
    .eq("id", callId)
    .eq("user_id", caller.uid)
    .single();

  if (!call) throw new Error("Call not found or does not belong to you");
  if (!call.scorable) throw new Error("Only scored calls can be disputed");

  const daysSince = (Date.now() - new Date(call.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 7) throw new Error("Disputes must be submitted within 7 days of the call");

  const admin = createAdminClient();

  // Check no existing dispute
  const { data: existing } = await admin
    .from("call_disputes")
    .select("id, status")
    .eq("call_id", callId)
    .maybeSingle();

  if (existing) throw new Error(`A dispute already exists for this call (${existing.status})`);

  const { data: dispute, error } = await admin
    .from("call_disputes")
    .insert({
      call_id:    callId,
      user_id:    caller.uid,
      company_id: caller.company_id,
      category,
      reason,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Email all QA users in this company
  const { data: qaUsers } = await admin
    .from("users")
    .select("email, full_name")
    .eq("company_id", caller.company_id)
    .eq("is_qa", true)
    .eq("is_active", true);

  if (qaUsers?.length) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: qaUsers.map((u) => u.email!).filter(Boolean),
        subject: `Score Dispute: ${caller.full_name ?? "A rep"} disputed a call`,
        html: `
          <p><strong>${caller.full_name ?? "A rep"}</strong> has disputed a call score.</p>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Call Stage:</strong> ${call.call_stage ?? "—"} &nbsp;|&nbsp; <strong>Score:</strong> ${call.score ?? "—"}</p>
          <br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/sales-coach/admin/disputes"
            style="background:#307DC0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            Review in AI Suite →
          </a>
        `,
      });
    } catch {
      // Non-fatal — dispute is saved even if email fails
    }
  }

  revalidatePath("/sales-coach/live-calls");
  return dispute;
}

export type DisputeRow = {
  id: string;
  call_id: string;
  user_id: string;
  company_id: string;
  category: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  resolution_reason: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
  rep: { full_name: string | null; email: string | null; agent_type: string | null } | null;
  call: {
    call_stage: string | null;
    score: number | null;
    created_at: string;
    crm_link: string | null;
    recording_url: string | null;
    scorable: boolean;
    contact_name: string | null;
    evaluation: Record<string, unknown> | null;
  } | null;
};

export async function getDisputes(status?: "pending" | "accepted" | "rejected"): Promise<DisputeRow[]> {
  const caller = await getCallerProfile();

  if (caller.access_role !== "super_admin" && !caller.is_qa) throw new Error("Forbidden");

  const admin = createAdminClient();
  let query = admin
    .from("call_disputes")
    .select(`
      id, call_id, user_id, company_id, category, reason, status,
      resolution_reason, resolved_by, created_at, resolved_at,
      rep:users!call_disputes_user_id_fkey(full_name, email, agent_type),
      call:live_calls!call_disputes_call_id_fkey(call_stage, score, created_at, crm_link, recording_url, scorable, contact_name, evaluation)
    `)
    .order("created_at", { ascending: false });

  if (caller.access_role !== "super_admin") {
    query = query.eq("company_id", caller.company_id!);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((d) => ({
    ...d,
    rep:  Array.isArray(d.rep)  ? (d.rep[0]  ?? null) : d.rep,
    call: Array.isArray(d.call) ? (d.call[0] ?? null) : d.call,
  })) as DisputeRow[];
}

export async function resolveDispute(
  disputeId: string,
  decision: "accepted" | "rejected",
  resolutionReason: string,
  newScore?: number | null,
) {
  const caller = await getCallerProfile();
  if (caller.access_role !== "super_admin" && !caller.is_qa) throw new Error("Forbidden");

  const admin = createAdminClient();

  const { data: dispute } = await admin
    .from("call_disputes")
    .select(`
      id, call_id, company_id, user_id, category, status,
      rep:users!call_disputes_user_id_fkey(email, full_name)
    `)
    .eq("id", disputeId)
    .single();

  if (!dispute) throw new Error("Dispute not found");
  if (dispute.status !== "pending") throw new Error("Dispute already resolved");
  if (caller.access_role !== "super_admin" && dispute.company_id !== caller.company_id) {
    throw new Error("Forbidden");
  }

  const { error } = await admin
    .from("call_disputes")
    .update({
      status:            decision,
      resolution_reason: resolutionReason,
      resolved_by:       caller.uid,
      resolved_at:       new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (error) throw new Error(error.message);

  // If accepted with a new score, update the call's score
  if (decision === "accepted" && newScore != null) {
    await admin
      .from("live_calls")
      .update({ score: Math.round(newScore) })
      .eq("id", dispute.call_id);
  }

  // Email the rep
  const rep = Array.isArray(dispute.rep) ? dispute.rep[0] : dispute.rep;
  if (rep?.email) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: rep.email,
        subject: `Your score dispute has been ${decision}`,
        html: `
          <p>Hi ${rep.full_name ?? "there"},</p>
          <p>Your score dispute (category: <strong>${dispute.category}</strong>) has been
            <strong style="color:${decision === "accepted" ? "#43B749" : "#ED1F24"}">${decision.toUpperCase()}</strong>.
          </p>
          <p><strong>Resolution:</strong> ${resolutionReason}</p>
          <p>Reviewed by: ${caller.full_name ?? "QA Team"}</p>
        `,
      });
    } catch {
      // Non-fatal
    }
  }

  revalidatePath("/sales-coach/admin/disputes");
}

export async function getMyDisputeMap(userId: string): Promise<Record<string, string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("call_disputes")
    .select("call_id, status")
    .eq("user_id", userId);

  const map: Record<string, string> = {};
  for (const d of data ?? []) map[d.call_id] = d.status;
  return map;
}
