import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
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

// Cost rates (GPT-5.4 Mini pricing)
const INPUT_COST_PER_TOKEN  = 0.75 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 4.50 / 1_000_000;
const MODEL_NAME = "gpt-5.4-mini";

interface NoteTakerPayload {
  location_id:    string | null;
  call_direction: string | null;  // "inbound" | "outbound"
  to:             string | null;
  from:           string | null;
  summary:        string | null;  // AI-generated summary
  normal_summary: string | null;  // plain summary
  input_tokens:   number | null;
  output_tokens:  number | null;
  duration_sec?:  number | null;  // call duration for Whisper transcription cost
  agent_name?:    string | null;  // rep who made the call
  call_id?:       string | null;  // optional idempotency key
  lead_source?:   string | null;  // e.g. "Facebook", "Google", "Cold List"
  contact_Phone?: string | null;  // contact's phone number from GHL webhook
  agent_phone?:   string | null;  // agent's phone (To if inbound, From if outbound)
  crm_link?:      string | null;  // URL to the contact in GHL/CRM
}

export async function POST(req: NextRequest) {
  console.log("[note-taker:ingest] ── incoming request ──────────────────────────");

  if (!verifySecret(req.headers.get("x-webhook-secret"))) {
    console.warn("[note-taker:ingest] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: NoteTakerPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { location_id, call_direction, to, from, summary, normal_summary, input_tokens, output_tokens, duration_sec, agent_name, call_id, lead_source, contact_Phone, agent_phone, crm_link } = body;

  if (!location_id) {
    return NextResponse.json({ error: "Missing required field: location_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve company
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .select("id, wallet_balance")
    .eq("ghl_sub_account_id", location_id)
    .maybeSingle();

  if (companyErr) {
    console.error("[note-taker:ingest] company lookup error:", companyErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!company) {
    return NextResponse.json({ error: `No company found for location_id ${location_id}` }, { status: 404 });
  }

  // Wallet pre-check
  if ((company.wallet_balance ?? 0) <= 0) {
    console.warn("[note-taker:ingest] insufficient wallet balance for company:", company.id);
    return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
  }

  // Calculate cost from tokens + Whisper transcription
  const inTokens       = Math.max(0, input_tokens  ?? 0);
  const outTokens      = Math.max(0, output_tokens ?? 0);
  const aiCostUsd      = (inTokens * INPUT_COST_PER_TOKEN) + (outTokens * OUTPUT_COST_PER_TOKEN);
  const whisperCostUsd = ((duration_sec ?? 0) / 60) * 0.006;
  const baseCostUsd    = aiCostUsd + whisperCostUsd;

  // Fetch billing multiplier — prefer company-specific override, fall back to global
  const { data: cfgRows } = await admin
    .from("billing_config")
    .select("multiplier, company_id")
    .eq("app", "note_taker")
    .or(`company_id.eq.${company.id},company_id.is.null`);
  const companyCfg   = cfgRows?.find(r => r.company_id === company.id);
  const globalCfg    = cfgRows?.find(r => r.company_id === null);
  const multiplier   = Number(companyCfg?.multiplier ?? globalCfg?.multiplier ?? 3.0);
  const deductionUsd = baseCostUsd * multiplier;

  // Insert note_taker_call — idempotent on external_call_id
  const { data: call, error: insertErr } = await admin
    .from("note_taker_calls")
    .insert({
      company_id:      company.id,
      external_call_id: call_id ?? null,
      call_direction,
      to_number:       to,
      from_number:     from,
      ai_summary:      summary,
      normal_summary,
      agent_name:      agent_name ?? null,
      lead_source:     lead_source ?? null,
      contact_phone:   contact_Phone ?? null,
      agent_phone:     agent_phone   ?? null,
      crm_link:        crm_link      ?? null,
      input_tokens:    inTokens,
      output_tokens:   outTokens,
      cost_usd:        baseCostUsd,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    }
    console.error("[note-taker:ingest] insert error:", insertErr.message);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }

  // Log usage (cost_usd is the multiplied amount — what's actually charged)
  if (deductionUsd > 0) {
    void logUsage({
      company_id:    company.id,
      app:           "note_taker",
      entity_id:     call.id,
      entity_type:   "note_taker_call",
      input_tokens:  inTokens,
      output_tokens: outTokens,
      cost_usd:      deductionUsd,
      model:         MODEL_NAME,
      cost_breakdown: {
        ai:            parseFloat((aiCostUsd      * multiplier).toFixed(6)),
        transcription: parseFloat((whisperCostUsd * multiplier).toFixed(6)),
      },
    });
  }

  // Deduct from wallet
  if (deductionUsd > 0) {
    const { data: newBalance, error: deductErr } = await admin.rpc("deduct_wallet_balance", {
      p_company_id:  company.id,
      p_amount_usd:  deductionUsd,
      p_description: "Note Taker flow",
      p_app:         "note_taker",
    });
    if (deductErr) console.error("[note-taker:ingest] wallet deduction failed:", deductErr.message);
    else void autoTopupIfNeeded(company.id, Number(newBalance));
  }

  console.log(`[note-taker:ingest] saved call ${call.id}, cost $${baseCostUsd.toFixed(6)}`);
  return NextResponse.json({ success: true, call_id: call.id }, { status: 200 });
}
