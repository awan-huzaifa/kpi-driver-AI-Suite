import Anthropic from "@anthropic-ai/sdk";
import { SCORER_SYSTEM_PROMPT, CALL_STAGE_MAP, selectFromBlock } from "./rubrics";
import type { SystemFacts } from "./rubrics";
import type { AgentType } from "@/types/database";

export type { SystemFacts };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY_SALES_COACH });

// ── Criterion result ──────────────────────────────────────────────────────────
export interface CriterionResult {
  id: string;
  weight: number;
  band: "mastery" | "proficient" | "developing" | "fail";
  earned: number;
  na: boolean;
  na_reason: string | null;
  evidence: { speaker: string; t: string; quote: string }[];
}

// ── Penalty ───────────────────────────────────────────────────────────────────
export interface PenaltyResult {
  code: string;      // e.g. "P1"
  points: number;    // negative, e.g. -10
  flag: string;      // e.g. "ROLE_BOUNDARY"
  evidence: string;
}

// ── Coaching ──────────────────────────────────────────────────────────────────
export interface CoachingResult {
  worked: string;
  fix: string;
  try_this_line: string;
}

// ── Main result (V2) ─────────────────────────────────────────────────────────
export interface ScoreResult {
  // Scorability
  scorable: boolean;
  ns_code: string | null;

  // Call metadata
  call_id: string | null;
  lead_id: string | null;
  rep_name: string | null;
  agent_type: string | null;
  call_stage: string | null;    // kept for ingest route backward compat
  call_result: string | null;

  // FROM / TO classification
  from_block: string | null;
  to_block: string | null;
  tw_applied: boolean;
  disposition_match: boolean;

  // Rubric
  rubric_version: string | null;
  criteria: CriterionResult[];

  // Computed metrics
  metrics: {
    talk_ratio: number | null;
    longest_monologue_s: number | null;
    open_questions: number | null;
    interruptions: number | null;
    silence_after_number_s: number | null;
    known_info_reasked: number | null;
  };

  // Scoring
  core_score: number | null;
  from_score: number | null;
  to_score: number | null;
  raw_score: number | null;
  critical_miss: { applied: boolean; block: string | null; deduction: number };
  penalties: PenaltyResult[];
  auto_fail: { code: string; evidence: string } | null;
  score: number | null;        // = final_score, kept for ingest backward compat
  score_band: string | null;
  flags: string[];

  // Coaching
  coaching: CoachingResult | null;

  // Usage
  _usage: { inputTokens: number; outputTokens: number; costUsd: number; model: string };
}

const SCORABLE_TYPES: AgentType[] = ["fus", "acq"];

export function mapCallStage(opportunityStage: string): string {
  return CALL_STAGE_MAP[opportunityStage] ?? opportunityStage;
}

function buildUserPrompt(
  transcript: string,
  agent_type: "fus" | "acq",
  fromBlock: string,
  resurrection: boolean,
  context: {
    stage_at_dial?: string | null;
    system_facts?: SystemFacts;
    disposition?: string | null;
    rep_name?: string | null;
    contact_id?: string | null;
    lead_id?: string | null;
    call_id?: string | null;
    call_date?: string | null;
    lead_source?: string | null;
    known_qualification?: string | null;
    prior_conversation_summary?: string | null;
    offer_history?: string | null;
    ai_agent_transcript?: string | null;
    seller_inbound_message?: string | null;
    training_context?: { agent_name: string; description: string | null } | null;
  }
): string {
  const sf = context.system_facts ?? { SF1: false, SF2: false, SF3: false, SF4: false };
  const role = agent_type === "fus" ? "follow_up_specialist (FUS)" : "acquisition_specialist (ACQ)";
  const rubricVersion = agent_type === "fus" ? "rubric-fus-v2" : "rubric-acq-v2";

  const trainingBlock = context.training_context
    ? `\nTRAINING CALL — ROLE PLAY:
This is a practice call with an AI voice agent, NOT a live seller.
AI Agent: "${context.training_context.agent_name}"${context.training_context.description ? `\nPersona: ${context.training_context.description}` : ""}
Score the rep's technique as normal. The "seller" responses came from an AI playing a character.\n`
    : "";

  const ctxLines = [
    context.rep_name     && `Rep Name: ${context.rep_name}`,
    context.call_id      && `Call ID: ${context.call_id}`,
    context.lead_id      && `Lead ID: ${context.lead_id}`,
    context.call_date    && `Call Date: ${context.call_date}`,
    context.lead_source  && `Lead Source: ${context.lead_source}`,
    context.disposition  && `Rep-Stated Disposition: ${context.disposition}`,
    context.known_qualification        && `Known Qualification at Dial: ${context.known_qualification}`,
    context.prior_conversation_summary && `Prior Conversation Summary: ${context.prior_conversation_summary}`,
    context.offer_history              && `Offer History: ${context.offer_history}`,
    context.ai_agent_transcript        && `AI Agent Conversation Summary: ${context.ai_agent_transcript}`,
    context.seller_inbound_message     && `Seller Inbound Message: ${context.seller_inbound_message}`,
  ].filter(Boolean).join("\n");

  return `EVALUATE THIS REAL ESTATE ${context.training_context ? "TRAINING/ROLE-PLAY" : "SALES"} CALL.

AGENT TYPE: ${role}
RUBRIC VERSION: ${rubricVersion}
STAGE AT DIAL: ${context.stage_at_dial ?? "Unknown"}
SELECTED FROM BLOCK: ${fromBlock}${resurrection ? " (RESURRECTION — lead was Dead)" : ""}
SYSTEM FACTS: SF1=${sf.SF1} SF2=${sf.SF2} SF3=${sf.SF3} SF4=${sf.SF4}
${trainingBlock}
CALL CONTEXT:
${ctxLines || "No additional context available."}

TRANSCRIPT:
${transcript}

SCORING TASK:
1. Determine if this call is scoreable. If not scoreable, return scorable=false and the correct ns_code with an explanation as call_result. Set all numeric scores to null and return an empty criteria array.
2. Compute all six metrics from the transcript.
3. Score each criterion for the ${agent_type.toUpperCase()} core (${agent_type === "fus" ? "F1–F8" : "A1–A8"}) with band + evidence quote.
4. Score the FROM block: ${fromBlock} with band + evidence quote.
5. Classify the TO block using the priority order. Check against rep-stated disposition if provided.
6. Score the TO block with band + evidence quote. If TW triggered, mark tw_applied=true; score both from_score and to_score from TW (each half of the 40 pts).
7. Compute: core_score = (core earned ÷ core applicable) × 100, from_score = from_earned, to_score = to_earned.
8. raw_score = ((core_earned + from_earned + to_earned) ÷ applicable_total) × 100
9. Apply critical miss cap: if FROM or TO block scored Fail, cap at 70.
10. Apply penalties P1–P4. Check auto-fails AF1–AF5.
11. Set all applicable flags.
12. Write the three coaching lines.
13. Return raw JSON only — no markdown, no commentary.`;
}

export async function scoreCall(
  transcript: string,
  agent_type: AgentType,
  context: {
    stage_at_dial?: string | null;
    system_facts?: SystemFacts;
    disposition?: string | null;
    rep_name?: string | null;
    contact_id?: string | null;
    lead_id?: string | null;
    call_id?: string | null;
    call_date?: string | null;
    lead_source?: string | null;
    known_outcome?: string | null;
    // CRM enrichments (optional — improve accuracy when present)
    known_qualification?: string | null;
    prior_conversation_summary?: string | null;
    offer_history?: string | null;
    ai_agent_transcript?: string | null;
    seller_inbound_message?: string | null;
    // Training context
    training_context?: { agent_name: string; description: string | null } | null;
    // Legacy compat
    opportunity_stage?: string | null;
  }
): Promise<ScoreResult> {
  const stage_at_dial = context.stage_at_dial ?? context.opportunity_stage ?? null;
  const call_stage = stage_at_dial;

  const emptyUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0, model: "" };

  if (!SCORABLE_TYPES.includes(agent_type)) {
    return {
      scorable: false,
      ns_code: "NS-5",
      call_id: context.call_id ?? null,
      lead_id: context.lead_id ?? null,
      rep_name: context.rep_name ?? null,
      agent_type,
      call_stage,
      call_result: "No rubric for this role",
      from_block: null,
      to_block: null,
      tw_applied: false,
      disposition_match: false,
      rubric_version: null,
      criteria: [],
      metrics: { talk_ratio: null, longest_monologue_s: null, open_questions: null, interruptions: null, silence_after_number_s: null, known_info_reasked: null },
      core_score: null,
      from_score: null,
      to_score: null,
      raw_score: null,
      critical_miss: { applied: false, block: null, deduction: 0 },
      penalties: [],
      auto_fail: null,
      score: null,
      score_band: null,
      flags: [],
      coaching: null,
      _usage: emptyUsage,
    };
  }

  const facts = context.system_facts ?? { SF1: false, SF2: false, SF3: false, SF4: false };
  const { block: fromBlock, resurrection, low_confidence } = selectFromBlock(stage_at_dial, facts, agent_type as "fus" | "acq");
  const rubric_version = agent_type === "fus" ? "rubric-fus-v2" : "rubric-acq-v2";

  const userPrompt = buildUserPrompt(transcript, agent_type as "fus" | "acq", fromBlock, resurrection, {
    stage_at_dial,
    system_facts: facts,
    disposition: context.disposition,
    rep_name: context.rep_name,
    contact_id: context.contact_id,
    lead_id: context.lead_id,
    call_id: context.call_id,
    call_date: context.call_date,
    lead_source: context.lead_source,
    known_qualification: context.known_qualification,
    prior_conversation_summary: context.prior_conversation_summary,
    offer_history: context.offer_history,
    ai_agent_transcript: context.ai_agent_transcript,
    seller_inbound_message: context.seller_inbound_message,
    training_context: context.training_context ?? null,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 16000,
    system: [
      {
        type: "text",
        text: SCORER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  // ── Token usage ───────────────────────────────────────────────────────────
  const u = response.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  const cacheRead  = u.cache_read_input_tokens    ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const inputBilled  = u.input_tokens;
  const outputBilled = u.output_tokens;
  // Sonnet 5.5: input $3/1M, output $15/1M, cache read $0.30/1M, cache write $3.75/1M
  const costUSD =
    (inputBilled  / 1_000_000) * 3.00 +
    (outputBilled / 1_000_000) * 15.00 +
    (cacheRead    / 1_000_000) * 0.30 +
    (cacheWrite   / 1_000_000) * 3.75;
  console.log("[scorer:tokens] ────────────────────────────────────────");
  console.log(`[scorer:tokens]  model        : ${response.model}`);
  console.log(`[scorer:tokens]  agent_type   : ${agent_type}`);
  console.log(`[scorer:tokens]  from_block   : ${fromBlock}`);
  console.log(`[scorer:tokens]  input        : ${inputBilled.toLocaleString()} tokens`);
  console.log(`[scorer:tokens]  output       : ${outputBilled.toLocaleString()} tokens`);
  console.log(`[scorer:tokens]  cache read   : ${cacheRead.toLocaleString()} tokens`);
  console.log(`[scorer:tokens]  cache write  : ${cacheWrite.toLocaleString()} tokens`);
  console.log(`[scorer:tokens]  est. cost    : $${costUSD.toFixed(5)}`);
  console.log(`[scorer:tokens]  stop_reason  : ${response.stop_reason}`);
  console.log("[scorer:tokens] ────────────────────────────────────────");
  // ─────────────────────────────────────────────────────────────────────────

  const textBlock = response.content.find(b => b.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : "";
  console.log(`[scorer] content blocks: ${response.content.map(b => b.type).join(", ")}`);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Scorer returned no parseable JSON. Raw: ${raw.slice(0, 300)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[scorer] JSON parse failed. stop_reason:", response.stop_reason, "raw tail:", raw.slice(-400));
    throw new Error(`Scorer JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
  }

  const _usage = { inputTokens: inputBilled, outputTokens: outputBilled, costUsd: costUSD, model: response.model };
  const scorable = parsed.scorable !== false;

  if (!scorable) {
    return {
      scorable: false,
      ns_code: parsed.ns_code ?? null,
      call_id: context.call_id ?? null,
      lead_id: context.lead_id ?? null,
      rep_name: context.rep_name ?? null,
      agent_type,
      call_stage,
      call_result: parsed.call_result ?? null,
      from_block: fromBlock,
      to_block: null,
      tw_applied: false,
      disposition_match: false,
      rubric_version,
      criteria: [],
      metrics: { talk_ratio: null, longest_monologue_s: null, open_questions: null, interruptions: null, silence_after_number_s: null, known_info_reasked: null },
      core_score: null,
      from_score: null,
      to_score: null,
      raw_score: null,
      critical_miss: { applied: false, block: null, deduction: 0 },
      penalties: [],
      auto_fail: null,
      score: null,
      score_band: null,
      flags: low_confidence ? ["LOW_CONFIDENCE"] : [],
      coaching: null,
      _usage,
    };
  }

  const flags: string[] = [...(parsed.flags ?? [])];
  if (low_confidence && !flags.includes("LOW_CONFIDENCE")) flags.push("LOW_CONFIDENCE");
  if (resurrection    && !flags.includes("RESURRECTION"))   flags.push("RESURRECTION");

  const finalScore: number | null = parsed.final_score != null ? parsed.final_score : null;

  return {
    scorable: true,
    ns_code: null,
    call_id: context.call_id ?? null,
    lead_id: context.lead_id ?? null,
    rep_name: context.rep_name ?? null,
    agent_type,
    call_stage,
    call_result: parsed.call_result ?? null,
    from_block: parsed.from_block ?? fromBlock,
    to_block: parsed.to_block ?? null,
    tw_applied: parsed.tw_applied === true,
    disposition_match: parsed.disposition_match !== false,
    rubric_version,
    criteria: parsed.criteria ?? [],
    metrics: {
      talk_ratio:            parsed.metrics?.talk_ratio            ?? null,
      longest_monologue_s:   parsed.metrics?.longest_monologue_s   ?? null,
      open_questions:        parsed.metrics?.open_questions         ?? null,
      interruptions:         parsed.metrics?.interruptions          ?? null,
      silence_after_number_s: parsed.metrics?.silence_after_number_s ?? null,
      known_info_reasked:    parsed.metrics?.known_info_reasked     ?? null,
    },
    core_score:     parsed.core_score  ?? null,
    from_score:     parsed.from_score  ?? null,
    to_score:       parsed.to_score    ?? null,
    raw_score:      parsed.raw_score   ?? null,
    critical_miss: {
      applied:   parsed.critical_miss?.applied  ?? false,
      block:     parsed.critical_miss?.block    ?? null,
      deduction: parsed.critical_miss?.deduction ?? 0,
    },
    penalties:  parsed.penalties  ?? [],
    auto_fail:  parsed.auto_fail  ?? null,
    score:      finalScore,
    score_band: parsed.band       ?? null,
    flags,
    coaching: parsed.coaching
      ? {
          worked:         parsed.coaching.worked         ?? "",
          fix:            parsed.coaching.fix            ?? "",
          try_this_line:  parsed.coaching.try_this_line  ?? "",
        }
      : null,
    _usage,
  };
}
