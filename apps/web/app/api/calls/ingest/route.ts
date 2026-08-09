import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreCall, type ScoreResult } from "@/lib/sales-coach/anthropic/scorer";
import { logUsage } from "@/lib/ai-usage";
import { autoTopupIfNeeded } from "@/lib/wallet";

function verifySecret(header: string | null): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !header) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(secret));
  } catch {
    return false;
  }
}

interface IngestPayload {
  agent_name:     string;  // rep's full name, exact match against users.full_name
  location_id:    string;  // GHL location ID, matched against companies.ghl_sub_account_id
  agent_phone?:   string;  // stored for reference only — no longer used to find the user
  contact_name?:  string;
  contact_phone?: string;
  direction:      "inbound" | "outbound";
  duration_sec:   number;
  transcript:     string;
  recording_url?: string;
  crm_link?:      string;
  stage?:         string;
  call_id?:       string;
  lead_id?:       string;
  call_date?:     string;
  lead_source?:   string;
  known_outcome?: string;
}

export async function POST(req: NextRequest) {
  console.log("[ingest] ── incoming request ──────────────────────────");

  // 1. Auth
  const secret = req.headers.get("x-webhook-secret");
  if (!verifySecret(secret)) {
    console.warn("[ingest] unauthorized — bad or missing x-webhook-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[ingest] auth ok");

  // 2. Parse body
  let body: IngestPayload;
  try {
    body = await req.json();
  } catch {
    console.error("[ingest] invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    agent_name, location_id, agent_phone, contact_name, contact_phone,
    direction, duration_sec, transcript,
    recording_url, crm_link,
    stage, call_id, lead_id, call_date, lead_source, known_outcome,
  } = body;

  console.log("[ingest] payload:", {
    agent_name, location_id, agent_phone, contact_name, contact_phone, direction, duration_sec,
    stage, call_id, lead_id, call_date, lead_source, known_outcome,
    recording_url, crm_link,
    transcript_length: transcript?.length ?? 0,
    transcript_preview: transcript?.slice(0, 200),
  });

  if (!agent_name || !location_id || !transcript || !direction) {
    console.warn("[ingest] missing required fields", { agent_name: !!agent_name, location_id: !!location_id, transcript: !!transcript, direction: !!direction });
    return NextResponse.json(
      { error: "Missing required fields: agent_name, location_id, transcript, direction" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 3a. Look up the company by GHL location ID
  console.log("[ingest] looking up company with location_id:", location_id);
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .select("id, wallet_balance")
    .eq("ghl_sub_account_id", location_id)
    .maybeSingle();

  if (companyErr) {
    console.error("[ingest] company lookup error:", companyErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!company) {
    console.warn("[ingest] no company found for location_id:", location_id);
    return NextResponse.json(
      { error: `No company found for location ID ${location_id}` },
      { status: 404 }
    );
  }

  // 3b. Look up the user by name, scoped to that company
  console.log("[ingest] looking up user with name:", agent_name, "in company:", company.id);
  const { data: user, error: userErr } = await admin
    .from("users")
    .select("id, full_name, agent_type, company_id, app_sales_coach")
    .eq("company_id", company.id)
    .eq("is_active", true)
    .ilike("full_name", agent_name.trim())
    .maybeSingle();

  if (userErr) {
    console.error("[ingest] user lookup error:", userErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!user) {
    console.warn("[ingest] no active user found with name:", agent_name, "for location_id:", location_id);
    return NextResponse.json(
      { error: `No active user named "${agent_name}" found for location ID ${location_id}` },
      { status: 404 }
    );
  }
  console.log("[ingest] user found:", { id: user.id, full_name: user.full_name, agent_type: user.agent_type, company_id: user.company_id });

  // 4. Wallet balance pre-check (fus/acq with app access only)
  const isScorable = ["fus", "acq"].includes(user.agent_type) && !!user.app_sales_coach;
  if (isScorable) {
    if ((company.wallet_balance ?? 0) <= 0) {
      console.warn("[ingest] insufficient wallet balance for company:", company.id);
      return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
    }
    console.log("[ingest] wallet balance ok:", company.wallet_balance);
  }

  // 5. Score the call
  console.log("[ingest] scoring call — agent_type:", user.agent_type);
  let result: ScoreResult;
  try {
    result = await scoreCall(transcript, user.agent_type, {
      rep_name:          user.full_name ?? undefined,
      call_id:           call_id,
      lead_id:           lead_id,
      call_date:         call_date,
      lead_source:       lead_source,
      known_outcome:     known_outcome,
      opportunity_stage: stage,
    });
    console.log("[ingest] score result:", {
      scorable:             result.scorable,
      score:                result.score,
      score_band:           result.score_band,
      call_stage:           result.call_stage,
      call_type:            result.call_type,
      opportunity_level:    result.opportunity_level,
      confidence:           result.confidence,
      manager_review_needed: result.manager_review_needed,
    });
  } catch (e) {
    console.error("[ingest] scoring error:", e);
    result = {
      scorable:              false,
      reason:                `Scoring failed: ${e instanceof Error ? e.message : "unknown error"}`,
      call_id:               call_id ?? null,
      lead_id:               lead_id ?? null,
      rep_name:              user.full_name ?? null,
      user_role:             user.agent_type,
      call_stage:            stage ?? null,
      call_type:             null,
      call_result:           null,
      opportunity_level:     null,
      rubric_version:        null,
      score:                 null,
      score_band:            null,
      category_scores:       null,
      penalties:             [],
      bonuses:               [],
      strengths:             [],
      missed_opportunities:  [],
      coaching_actions:      [],
      score_reasoning:       null,
      evidence_snippets:     [],
      confidence:            null,
      manager_review_needed: false,
      _usage:                { inputTokens: 0, outputTokens: 0, costUsd: 0, model: "" },
    };
  }

  // 6. Save to live_calls
  console.log("[ingest] inserting into live_calls...");
  const { data: call, error: insertErr } = await admin
    .from("live_calls")
    .insert({
      user_id:       user.id,
      company_id:    user.company_id,
      contact_name:  contact_name  ?? null,
      contact_phone: contact_phone ?? null,
      agent_phone:   agent_phone   ?? null,
      direction,
      duration_sec,
      call_stage:    result.call_stage ?? stage ?? null,
      scorable:      result.scorable,
      score:         result.score,
      call_result:   result.call_result ?? null,
      transcript,
      recording_url: recording_url ?? null,
      crm_link:      crm_link      ?? null,
      evaluation: {
        reason:                result.reason,
        call_type:             result.call_type,
        opportunity_level:     result.opportunity_level,
        rubric_version:        result.rubric_version,
        score_band:            result.score_band,
        category_scores:       result.category_scores,
        penalties:             result.penalties,
        bonuses:               result.bonuses,
        strengths:             result.strengths,
        missed_opportunities:  result.missed_opportunities,
        coaching_actions:      result.coaching_actions,
        score_reasoning:       result.score_reasoning,
        evidence_snippets:     result.evidence_snippets,
        confidence:            result.confidence,
        manager_review_needed: result.manager_review_needed,
        meta: {
          call_id:      call_id      ?? null,
          lead_id:      lead_id      ?? null,
          call_date:    call_date    ?? null,
          lead_source:  lead_source  ?? null,
          known_outcome: known_outcome ?? null,
        },
      },
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[ingest] insert error:", insertErr.message);
    return NextResponse.json({ error: "Failed to save call" }, { status: 500 });
  }

  console.log("[ingest] success — call_id:", call.id);
  console.log("[ingest] ────────────────────────────────────────────────");

  if (isScorable && user.company_id) {
    // Fetch per-token charged prices — prefer company override, fall back to global
    const { data: cfgRows } = await admin
      .from("billing_config")
      .select("claude_input_charged_per_m, claude_output_charged_per_m, company_id")
      .eq("app", "sales_coach")
      .or(`company_id.eq.${user.company_id},company_id.is.null`);
    const pricingRow = cfgRows?.find(r => r.company_id === user.company_id) ?? cfgRows?.find(r => r.company_id === null);

    const chargedInputPerM  = Number(pricingRow?.claude_input_charged_per_m  ?? 3.0);
    const chargedOutputPerM = Number(pricingRow?.claude_output_charged_per_m ?? 15.0);
    const deductionUsd = (result._usage.inputTokens  / 1_000_000) * chargedInputPerM
                       + (result._usage.outputTokens / 1_000_000) * chargedOutputPerM;

    console.log(`[ingest:billing] in=${result._usage.inputTokens} out=${result._usage.outputTokens} charged=$${deductionUsd.toFixed(5)} (${chargedInputPerM}/1M in · ${chargedOutputPerM}/1M out)`);

    void logUsage({
      company_id:    user.company_id,
      app:           "sales_coach",
      entity_id:     call.id,
      entity_type:   "live_call",
      input_tokens:  result._usage.inputTokens,
      output_tokens: result._usage.outputTokens,
      cost_usd:      deductionUsd,
      model:         result._usage.model,
      cost_breakdown: {
        ai: parseFloat(deductionUsd.toFixed(6)),
      },
    });

    if (deductionUsd > 0) {
      const { data: newBalance, error: deductErr } = await admin.rpc("deduct_wallet_balance", {
        p_company_id:  user.company_id,
        p_amount_usd:  deductionUsd,
        p_description: "Live call scored",
        p_app:         "sales_coach",
      });
      if (deductErr) console.error("[calls:ingest] wallet deduction failed:", deductErr.message);
      else void autoTopupIfNeeded(user.company_id, Number(newBalance));
    }
  }

  return NextResponse.json(
    {
      success:  true,
      call_id:  call.id,
      scorable: result.scorable,
      score:    result.score,
      score_band: result.score_band,
      manager_review_needed: result.manager_review_needed,
    },
    { status: 200 }
  );
}
