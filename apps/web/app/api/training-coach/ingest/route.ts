import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreCall, type ScoreResult } from "@/lib/sales-coach/anthropic/scorer";
import { logUsage } from "@/lib/ai-usage";
import { autoTopupIfNeeded } from "@/lib/wallet";
import type { AgentType } from "@/types/database";

function verifySecret(header: string | null): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !header) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(secret));
  } catch {
    return false;
  }
}

// Shape of Assistable AI's post-call webhook body.
interface AssistablePayload {
  call_id:            string | null;
  location_id?:       string | null; // optional — no longer used for company lookup
  direction:          "inbound" | "outbound" | null;
  to:                 string | null; // AI agent's dedicated number
  from:               string | null; // rep's phone number — used to resolve user + company
  recording_url?:     string | null;
  call_time_seconds?: number | null;
  full_transcript:    string | null;
  call_summary?:      string | null;
}

function fallbackScoreResult(agentType: AgentType, reason: string): ScoreResult {
  return {
    scorable:          false,
    ns_code:           "NS-5",
    call_id:           null,
    lead_id:           null,
    rep_name:          null,
    agent_type:        agentType,
    call_stage:        null,
    call_result:       reason,
    from_block:        null,
    to_block:          null,
    tw_applied:        false,
    disposition_match: false,
    rubric_version:    null,
    criteria:          [],
    metrics: { talk_ratio: null, longest_monologue_s: null, open_questions: null, interruptions: null, silence_after_number_s: null, known_info_reasked: null },
    core_score:        null,
    from_score:        null,
    to_score:          null,
    raw_score:         null,
    critical_miss:     { applied: false, block: null, deduction: 0 },
    penalties:         [],
    auto_fail:         null,
    score:             null,
    score_band:        null,
    flags:             [],
    coaching:          null,
    _usage:            { inputTokens: 0, outputTokens: 0, costUsd: 0, model: "" },
  };
}

export async function POST(req: NextRequest) {
  console.log("[training-coach:ingest] ── incoming request ──────────────────────────");

  // 1. Auth
  if (!verifySecret(req.headers.get("x-webhook-secret"))) {
    console.warn("[training-coach:ingest] unauthorized — bad or missing x-webhook-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: AssistablePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    call_id, direction, to, from,
    recording_url, call_time_seconds, full_transcript, call_summary,
  } = body;

  if (!from || !full_transcript || !direction) {
    return NextResponse.json(
      { error: "Missing required fields: from, direction, full_transcript" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 3. Resolve rep via user_phones — from number is the source of truth for both user + company.
  const { data: phoneRow, error: phoneErr } = await admin
    .from("user_phones")
    .select("user_id")
    .eq("phone", from)
    .maybeSingle();

  if (phoneErr) {
    console.error("[training-coach:ingest] phone lookup error:", phoneErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!phoneRow) {
    return NextResponse.json(
      { error: `No user registered with phone ${from}` },
      { status: 404 }
    );
  }

  const { data: user, error: userErr } = await admin
    .from("users")
    .select("id, agent_type, company_id")
    .eq("id", phoneRow.user_id)
    .eq("is_active", true)
    .maybeSingle();

  if (userErr) {
    console.error("[training-coach:ingest] user lookup error:", userErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json(
      { error: `User for phone ${from} is not active` },
      { status: 404 }
    );
  }
  if (!user.company_id) {
    return NextResponse.json(
      { error: `User for phone ${from} has no company assigned` },
      { status: 404 }
    );
  }

  // 4. Fetch company (for wallet balance)
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .select("id, wallet_balance")
    .eq("id", user.company_id)
    .maybeSingle();

  if (companyErr) {
    console.error("[training-coach:ingest] company lookup error:", companyErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // 4b. Wallet balance pre-check before calling Claude
  if ((company.wallet_balance ?? 0) <= 0) {
    console.warn("[training-coach:ingest] insufficient wallet balance for company:", company.id);
    return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
  }

  // 5. Resolve AI agent by its dedicated number — best-effort, never blocks scoring.
  let aiAgentId: string | null = null;
  let aiAgentName: string | null = null;
  let aiAgentDescription: string | null = null;
  if (to) {
    const { data: agent } = await admin
      .from("training_ai_agents")
      .select("id, agent_name, description")
      .eq("phone_number", to)
      .maybeSingle();
    aiAgentId          = agent?.id          ?? null;
    aiAgentName        = agent?.agent_name  ?? null;
    aiAgentDescription = agent?.description ?? null;
  }

  // 6. Score the call
  let result: ScoreResult;
  try {
    result = await scoreCall(full_transcript, user.agent_type, {
      call_id: call_id ?? undefined,
      ...(aiAgentName ? {
        training_context: {
          agent_name:  aiAgentName,
          description: aiAgentDescription,
        },
      } : {}),
    });
  } catch (e) {
    console.error("[training-coach:ingest] scoring error:", e);
    result = fallbackScoreResult(
      user.agent_type,
      `Scoring failed: ${e instanceof Error ? e.message : "unknown error"}`
    );
  }

  // 7. Calculate cost before insert (so it can be stored on the row)
  const { data: cfgRows } = await admin
    .from("billing_config")
    .select("assistable_charged_per_min, claude_input_charged_per_m, claude_output_charged_per_m, assistable_cost_per_min, claude_input_cost_per_m, claude_output_cost_per_m, company_id")
    .eq("app", "training_coach")
    .or(`company_id.eq.${company.id},company_id.is.null`);
  const pricingRow = cfgRows?.find(r => r.company_id === company.id) ?? cfgRows?.find(r => r.company_id === null);

  const chargedAssistablePerMin = Number(pricingRow?.assistable_charged_per_min ?? 0.15);
  const chargedInputPerM        = Number(pricingRow?.claude_input_charged_per_m  ?? 3.0);
  const chargedOutputPerM       = Number(pricingRow?.claude_output_charged_per_m ?? 15.0);
  const costAssistablePerMin    = Number(pricingRow?.assistable_cost_per_min     ?? 0.07);
  const costInputPerM           = Number(pricingRow?.claude_input_cost_per_m     ?? 3.0);
  const costOutputPerM          = Number(pricingRow?.claude_output_cost_per_m    ?? 15.0);

  const callMinutes        = (call_time_seconds ?? 0) / 60;
  const assistableCharged  = callMinutes * chargedAssistablePerMin;
  const claudeCharged      = (result._usage.inputTokens  / 1_000_000) * chargedInputPerM
                           + (result._usage.outputTokens / 1_000_000) * chargedOutputPerM;
  const deductionUsd       = assistableCharged + claudeCharged;
  const providerCostUsd    = callMinutes * costAssistablePerMin
                           + (result._usage.inputTokens  / 1_000_000) * costInputPerM
                           + (result._usage.outputTokens / 1_000_000) * costOutputPerM;

  // 8. Save — idempotent on external_call_id (Assistable may retry webhook deliveries)
  const { data: call, error: insertErr } = await admin
    .from("training_calls")
    .insert({
      user_id:          user.id,
      company_id:       company.id,
      ai_agent_id:      aiAgentId,
      external_call_id: call_id ?? null,
      from_phone:       from,
      direction,
      duration_sec:     call_time_seconds != null ? Math.round(call_time_seconds) : null,
      call_stage:       result.call_stage ?? null,
      scorable:         result.scorable,
      score:            result.score,
      call_result:      result.call_result ?? null,
      call_summary:     call_summary ?? null,
      transcript:       full_transcript,
      recording_url:    recording_url ?? null,
      cost_usd:         deductionUsd,
      evaluation: {
        rubric_version:    result.rubric_version,
        from_block:        result.from_block,
        to_block:          result.to_block,
        tw_applied:        result.tw_applied,
        disposition_match: result.disposition_match,
        score_band:        result.score_band,
        core_score:        result.core_score,
        from_score:        result.from_score,
        to_score:          result.to_score,
        raw_score:         result.raw_score,
        critical_miss:     result.critical_miss,
        penalties:         result.penalties,
        auto_fail:         result.auto_fail,
        flags:             result.flags,
        criteria:          result.criteria,
        metrics:           result.metrics,
        coaching:          result.coaching,
      },
    })
    .select("id")
    .single();

  if (insertErr) {
    // Unique violation on external_call_id → this exact call was already ingested
    if (insertErr.code === "23505") {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    }
    console.error("[training-coach:ingest] insert error:", insertErr.message);
    return NextResponse.json({ error: "Failed to save call" }, { status: 500 });
  }

  console.log(`[training-coach:billing] mins=${callMinutes.toFixed(2)} charged=$${deductionUsd.toFixed(5)} cost=$${providerCostUsd.toFixed(5)}`);

  await logUsage({
    company_id:        company.id,
    app:               "training_coach",
    entity_id:         call.id,
    entity_type:       "training_call",
    input_tokens:      result._usage.inputTokens,
    output_tokens:     result._usage.outputTokens,
    cost_usd:          deductionUsd,
    model:             result._usage.model,
    provider_cost_usd: providerCostUsd,
    cost_breakdown: {
      ai:          parseFloat(claudeCharged.toFixed(6)),
      voice_agent: parseFloat(assistableCharged.toFixed(6)),
    },
  });

  if (deductionUsd > 0) {
    const { data: newBalance, error: deductErr } = await admin.rpc("deduct_wallet_balance", {
      p_company_id:  company.id,
      p_amount_usd:  deductionUsd,
      p_description: "Training call scored",
      p_app:         "training_coach",
    });
    if (deductErr) console.error("[training-coach:ingest] wallet deduction failed:", deductErr.message);
    else void autoTopupIfNeeded(company.id, Number(newBalance));
  }

  return NextResponse.json(
    { success: true, call_id: call.id, scorable: result.scorable, score: result.score },
    { status: 200 }
  );
}
