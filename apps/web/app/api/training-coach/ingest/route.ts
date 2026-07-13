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
    scorable: false,
    reason,
    call_id: null,
    lead_id: null,
    rep_name: null,
    user_role: agentType,
    call_stage: null,
    call_type: null,
    opportunity_level: null,
    rubric_version: null,
    score: null,
    score_band: null,
    category_scores: null,
    penalties: [],
    bonuses: [],
    strengths: [],
    missed_opportunities: [],
    coaching_actions: [],
    score_reasoning: null,
    evidence_snippets: [],
    confidence: null,
    manager_review_needed: false,
    _usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, model: "" },
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

  // 7. Save — idempotent on external_call_id (Assistable may retry webhook deliveries)
  const { data: call, error: insertErr } = await admin
    .from("training_calls")
    .insert({
      user_id:          user.id,
      company_id:       company.id,
      ai_agent_id:      aiAgentId,
      external_call_id: call_id ?? null,
      direction,
      duration_sec:     call_time_seconds != null ? Math.round(call_time_seconds) : null,
      call_stage:       result.call_stage ?? null,
      scorable:         result.scorable,
      score:            result.score,
      call_result:      null,
      call_summary:     call_summary ?? null,
      transcript:       full_transcript,
      recording_url:    recording_url ?? null,
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

  const assistableCostUsd = ((call_time_seconds ?? 0) / 60) * 0.15;
  const aiCostUsd         = result._usage.costUsd;
  const totalRawCost      = aiCostUsd + assistableCostUsd;

  if (totalRawCost > 0) {
    const { data: cfgRows } = await admin
      .from("billing_config")
      .select("multiplier, company_id")
      .eq("app", "training_coach")
      .or(`company_id.eq.${company.id},company_id.is.null`);
    const companyCfg   = cfgRows?.find(r => r.company_id === company.id);
    const globalCfg    = cfgRows?.find(r => r.company_id === null);
    const multiplier   = Number(companyCfg?.multiplier ?? globalCfg?.multiplier ?? 3.0);
    const deductionUsd = totalRawCost * multiplier;

    void logUsage({
      company_id:    company.id,
      app:           "training_coach",
      entity_id:     call.id,
      entity_type:   "training_call",
      input_tokens:  result._usage.inputTokens,
      output_tokens: result._usage.outputTokens,
      cost_usd:      deductionUsd,
      model:         result._usage.model,
      cost_breakdown: {
        ai:          parseFloat((aiCostUsd         * multiplier).toFixed(6)),
        voice_agent: parseFloat((assistableCostUsd * multiplier).toFixed(6)),
      },
    });

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
