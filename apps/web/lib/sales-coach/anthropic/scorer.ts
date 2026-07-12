import Anthropic from "@anthropic-ai/sdk";
import { RUBRIC_FUS, RUBRIC_ACQ, CALL_STAGE_MAP } from "./rubrics";
import type { AgentType } from "@/types/database";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY_SALES_COACH });

export interface Penalty {
  type: string;
  points: number;
  reason: string;
  evidence: string;
}

export interface Bonus {
  type: string;
  points: number;
  reason: string;
  evidence: string;
}

export interface CoachingAction {
  type: "behavioral" | "tactical" | "strategic";
  action: string;
}

export interface EvidenceSnippet {
  quote: string;
  why_it_matters: string;
}

export interface ScoreResult {
  scorable: boolean;
  reason: string;
  call_id: string | null;
  lead_id: string | null;
  rep_name: string | null;
  user_role: string | null;
  call_stage: string | null;
  call_type: string | null;
  opportunity_level: "low" | "medium" | "high" | null;
  rubric_version: string | null;
  score: number | null;
  score_band: "Elite" | "Strong" | "Workable" | "Weak" | "Needs Coaching" | null;
  category_scores: Record<string, number> | null;
  penalties: Penalty[];
  bonuses: Bonus[];
  strengths: string[];
  missed_opportunities: string[];
  coaching_actions: CoachingAction[];
  score_reasoning: string | null;
  evidence_snippets: EvidenceSnippet[];
  confidence: number | null;
  manager_review_needed: boolean;
  _usage: { inputTokens: number; outputTokens: number; costUsd: number; model: string };
}

const SCORABLE: AgentType[] = ["fus", "acq"];

const MASTER_SYSTEM_PROMPT = `You are an expert QA evaluator and sales coach for a real estate investment company.

Your job is to evaluate call transcripts for two possible user roles:
1. follow_up_specialist (FUS)
2. acquisition_specialist (ACQ)

You must score each call fairly based on:
- the user's role
- the call stage
- the opportunity level
- the correct next action for that scenario

Do NOT judge calls only by whether a contract was signed.
Do NOT reward aggressive closing when the situation did not justify it.
Do NOT punish a rep for failing to close a deal that was not realistically closable.

You must score decision quality, execution quality, communication quality, and role alignment.

Scoring rules:
- Use only evidence from the transcript
- Do not invent facts
- If something is unclear, lower confidence and note uncertainty
- Keep coaching specific, actionable, and role-based

Set manager_review_needed = true if:
- score < 55
- compliance issue detected
- hostile behavior detected
- urgent foreclosure or highly urgent distress
- low confidence (below 0.6)
- transcript ambiguity materially affects score

You must return valid JSON only — no markdown, no explanation, raw JSON only.`;

const JSON_SCHEMA = `{
  "scorable": true,
  "reason": "string",
  "call_type": "string",
  "opportunity_level": "low | medium | high",
  "overall_score": 0,
  "score_band": "Elite | Strong | Workable | Weak | Needs Coaching",
  "category_scores": {
    "Category Name": 0
  },
  "penalties": [
    { "type": "string", "points": 0, "reason": "string", "evidence": "string" }
  ],
  "bonuses": [
    { "type": "string", "points": 0, "reason": "string", "evidence": "string" }
  ],
  "strengths": ["string"],
  "missed_opportunities": ["string"],
  "coaching_actions": [
    { "type": "behavioral | tactical | strategic", "action": "string" }
  ],
  "score_reasoning": "string",
  "evidence_snippets": [
    { "quote": "string", "why_it_matters": "string" }
  ],
  "confidence": 0.0,
  "manager_review_needed": false
}`;

export function mapCallStage(opportunityStage: string): string {
  return CALL_STAGE_MAP[opportunityStage] ?? opportunityStage;
}

export async function scoreCall(
  transcript: string,
  agent_type: AgentType,
  context?: {
    rep_name?: string;
    lead_id?: string;
    call_id?: string;
    call_date?: string;
    lead_source?: string;
    known_outcome?: string;
    opportunity_stage?: string;
  }
): Promise<ScoreResult> {
  const call_stage = context?.opportunity_stage ?? null;

  if (!SCORABLE.includes(agent_type)) {
    return {
      scorable: false,
      reason: "No rubric available for this agent type",
      call_id: context?.call_id ?? null,
      lead_id: context?.lead_id ?? null,
      rep_name: context?.rep_name ?? null,
      user_role: agent_type,
      call_stage,
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

  const rubric = agent_type === "fus" ? RUBRIC_FUS : RUBRIC_ACQ;
  const user_role = agent_type === "fus" ? "follow_up_specialist" : "acquisition_specialist";
  const rubric_version = agent_type === "fus" ? "rubric-a-fus-v1" : "rubric-b-acq-v1";

  const userPrompt = `Evaluate this real estate sales call.

USER ROLE: ${user_role}
CALL STAGE: ${call_stage ?? "Unknown"}
RUBRIC VERSION: ${rubric_version}

SCORING RUBRIC:
${rubric}

TRANSCRIPT:
${transcript}

ADDITIONAL CONTEXT:
- Rep Name: ${context?.rep_name ?? "Unknown"}
- Lead ID: ${context?.lead_id ?? "Unknown"}
- Call ID: ${context?.call_id ?? "Unknown"}
- Call Date: ${context?.call_date ?? "Unknown"}
- Lead Source: ${context?.lead_source ?? "Unknown"}
- Known Outcome: ${context?.known_outcome ?? "Unknown"}

Instructions:
1. Classify the call type
2. Determine opportunity level: low, medium, or high
3. Score each category according to the rubric
4. Apply penalties only when supported by transcript evidence
5. Apply bonuses only when justified
6. Return exactly 3 coaching actions: 1 behavioral, 1 tactical, 1 strategic
7. Set manager_review_needed = true when criteria are met

Return JSON only matching this schema:
${JSON_SCHEMA}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: MASTER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  // ── Token usage log ────────────────────────────────────────────────────────
  const u = response.usage as {
    input_tokens:                number;
    output_tokens:               number;
    cache_read_input_tokens?:    number;
    cache_creation_input_tokens?: number;
  };
  const cacheRead    = u.cache_read_input_tokens    ?? 0;
  const cacheWrite   = u.cache_creation_input_tokens ?? 0;
  const inputBilled  = u.input_tokens;
  const outputBilled = u.output_tokens;
  // Pricing: Sonnet 4.6 — input $3/1M, output $15/1M, cache read $0.30/1M, cache write $3.75/1M
  const costUSD =
    (inputBilled  / 1_000_000) * 3.00 +
    (outputBilled / 1_000_000) * 15.00 +
    (cacheRead    / 1_000_000) * 0.30 +
    (cacheWrite   / 1_000_000) * 3.75;
  console.log("[scorer:tokens] ────────────────────────────────────────");
  console.log(`[scorer:tokens]  model        : ${response.model}`);
  console.log(`[scorer:tokens]  agent_type   : ${agent_type}`);
  console.log(`[scorer:tokens]  input        : ${inputBilled.toLocaleString()} tokens`);
  console.log(`[scorer:tokens]  output       : ${outputBilled.toLocaleString()} tokens`);
  console.log(`[scorer:tokens]  cache read   : ${cacheRead.toLocaleString()} tokens`);
  console.log(`[scorer:tokens]  cache write  : ${cacheWrite.toLocaleString()} tokens`);
  console.log(`[scorer:tokens]  total        : ${(inputBilled + outputBilled).toLocaleString()} tokens`);
  console.log(`[scorer:tokens]  est. cost    : $${costUSD.toFixed(5)}`);
  console.log(`[scorer:tokens]  stop_reason  : ${response.stop_reason}`);
  console.log("[scorer:tokens] ────────────────────────────────────────");
  // ───────────────────────────────────────────────────────────────────────────

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Scorer returned no parseable JSON. Raw: ${raw.slice(0, 300)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[scorer] JSON parse failed. stop_reason:", response.stop_reason, "raw tail:", raw.slice(-300));
    throw new Error(`Scorer JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return {
    scorable: parsed.scorable ?? true,
    reason: parsed.reason ?? "",
    call_id: context?.call_id ?? null,
    lead_id: context?.lead_id ?? null,
    rep_name: context?.rep_name ?? null,
    user_role,
    call_stage,
    call_type: parsed.call_type ?? null,
    opportunity_level: parsed.opportunity_level ?? null,
    rubric_version,
    score: parsed.overall_score ?? null,
    score_band: parsed.score_band ?? null,
    category_scores: parsed.category_scores ?? null,
    penalties: parsed.penalties ?? [],
    bonuses: parsed.bonuses ?? [],
    strengths: parsed.strengths ?? [],
    missed_opportunities: parsed.missed_opportunities ?? [],
    coaching_actions: parsed.coaching_actions ?? [],
    score_reasoning: parsed.score_reasoning ?? null,
    evidence_snippets: parsed.evidence_snippets ?? [],
    confidence: parsed.confidence ?? null,
    manager_review_needed: parsed.manager_review_needed ?? false,
    _usage: { inputTokens: inputBilled, outputTokens: outputBilled, costUsd: costUSD, model: response.model },
  };
}