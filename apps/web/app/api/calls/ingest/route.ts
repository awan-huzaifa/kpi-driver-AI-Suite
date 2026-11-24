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
  agent_name:     string;  // rep's full name, matched against users.full_name
  location_id:    string;  // GHL location ID, matched against companies.ghl_sub_account_id
  contact_id?:    string;  // GHL contact ID — used to compute system facts SF1–SF3
  agent_phone?:   string;  // stored for reference only
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
  disposition?:   string;  // rep's stated outcome — used for DISPOSITION_MISMATCH flag
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
    agent_name, location_id, contact_id, agent_phone, contact_name, contact_phone,
    direction, duration_sec, transcript,
    recording_url, crm_link,
    stage, call_id, lead_id, call_date, lead_source, known_outcome, disposition,
  } = body;

  console.log("[ingest] payload:", {
    agent_name, location_id, contact_id, agent_phone, contact_name, contact_phone, direction, duration_sec,
    stage, call_id, lead_id, call_date, lead_source, known_outcome, disposition,
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

  // 5. Compute system facts from prior call history (requires contact_id)
  const systemFacts = { SF1: false, SF2: false, SF3: false, SF4: false };
  if (contact_id && company.id && isScorable) {
    // Fetch prior scorable calls for this contact (user_id + evaluation JSONB)
    const { data: priorCalls } = await admin
      .from("live_calls")
      .select("user_id, evaluation")
      .eq("company_id", company.id)
      .eq("contact_id", contact_id)
      .eq("scorable", true)
      .gt("duration_sec", 30);

    if (priorCalls && priorCalls.length > 0) {
      systemFacts.SF1 = true;

      // SF3: any prior call ended with an offer block (T5/T6/T7)
      systemFacts.SF3 = priorCalls.some(c => {
        const toBlock = (c.evaluation as Record<string, unknown> | null)?.to_block as string | undefined;
        return ["T5", "T6", "T7"].includes(toBlock ?? "");
      });

      // SF2: any prior call was made by an ACQ rep — check user_ids
      const priorUserIds = [...new Set(priorCalls.map(c => c.user_id).filter(Boolean))];
      if (priorUserIds.length > 0) {
        const { data: acqUsers } = await admin
          .from("users")
          .select("id")
          .in("id", priorUserIds)
          .eq("agent_type", "acq");
        systemFacts.SF2 = (acqUsers?.length ?? 0) > 0;
      }
    }
    console.log("[ingest] system facts:", systemFacts, "from", priorCalls?.length ?? 0, "prior calls for contact:", contact_id);
  } else {
    console.log("[ingest] skipping system facts —", !contact_id ? "no contact_id in payload" : "not a scorable agent type");
  }

  // 6. Score the call
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
      stage_at_dial:     stage ?? undefined,
      system_facts:      systemFacts,
      disposition:       disposition ?? undefined,
    });
    console.log("[ingest] score result:", {
      scorable:   result.scorable,
      score:      result.score,
      score_band: result.score_band,
      call_stage: result.call_stage,
      from_block: result.from_block,
      to_block:   result.to_block,
      flags:      result.flags,
    });
  } catch (e) {
    console.error("[ingest] scoring error:", e);
    result = {
      scorable:         false,
      ns_code:          "NS-5",
      call_id:          call_id ?? null,
      lead_id:          lead_id ?? null,
      rep_name:         user.full_name ?? null,
      agent_type:       user.agent_type,
      call_stage:       stage ?? null,
      call_result:      `Scoring failed: ${e instanceof Error ? e.message : "unknown error"}`,
      from_block:       null,
      to_block:         null,
      tw_applied:       false,
      disposition_match: false,
      rubric_version:   null,
      criteria:         [],
      metrics: { talk_ratio: null, longest_monologue_s: null, open_questions: null, interruptions: null, silence_after_number_s: null, known_info_reasked: null },
      core_score:       null,
      from_score:       null,
      to_score:         null,
      raw_score:        null,
      critical_miss:    { applied: false, block: null, deduction: 0 },
      penalties:        [],
      auto_fail:        null,
      score:            null,
      score_band:       null,
      flags:            [],
      coaching:         null,
      _usage:           { inputTokens: 0, outputTokens: 0, costUsd: 0, model: "" },
    };
  }

  // 6. Calculate cost before insert (so it can be stored on the row)
  let deductionUsd   = 0;
  let providerCostUsd = 0;
  let chargedInputPerM  = 3.0;
  let chargedOutputPerM = 15.0;
  let costInputPerM     = 3.0;
  let costOutputPerM    = 15.0;

  if (isScorable && user.company_id) {
    const { data: cfgRows } = await admin
      .from("billing_config")
      .select("claude_input_charged_per_m, claude_output_charged_per_m, claude_input_cost_per_m, claude_output_cost_per_m, company_id")
      .eq("app", "sales_coach")
      .or(`company_id.eq.${user.company_id},company_id.is.null`);
    const pricingRow = cfgRows?.find(r => r.company_id === user.company_id) ?? cfgRows?.find(r => r.company_id === null);

    chargedInputPerM  = Number(pricingRow?.claude_input_charged_per_m  ?? 3.0);
    chargedOutputPerM = Number(pricingRow?.claude_output_charged_per_m ?? 15.0);
    costInputPerM     = Number(pricingRow?.claude_input_cost_per_m     ?? 3.0);
    costOutputPerM    = Number(pricingRow?.claude_output_cost_per_m    ?? 15.0);
    deductionUsd   = (result._usage.inputTokens  / 1_000_000) * chargedInputPerM
                   + (result._usage.outputTokens / 1_000_000) * chargedOutputPerM;
    providerCostUsd = (result._usage.inputTokens  / 1_000_000) * costInputPerM
                    + (result._usage.outputTokens / 1_000_000) * costOutputPerM;
  }

  // 7. Save to live_calls
  console.log("[ingest] inserting into live_calls...");
  const { data: call, error: insertErr } = await admin
    .from("live_calls")
    .insert({
      user_id:       user.id,
      company_id:    user.company_id,
      contact_id:    contact_id    ?? null,
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
      cost_usd:      deductionUsd,
      evaluation: {
        rubric_version:   result.rubric_version,
        from_block:       result.from_block,
        to_block:         result.to_block,
        tw_applied:       result.tw_applied,
        disposition_match: result.disposition_match,
        score_band:       result.score_band,
        core_score:       result.core_score,
        from_score:       result.from_score,
        to_score:         result.to_score,
        raw_score:        result.raw_score,
        critical_miss:    result.critical_miss,
        penalties:        result.penalties,
        auto_fail:        result.auto_fail,
        flags:            result.flags,
        criteria:         result.criteria,
        metrics:          result.metrics,
        coaching:         result.coaching,
        meta: {
          call_id:      call_id       ?? null,
          lead_id:      lead_id       ?? null,
          call_date:    call_date     ?? null,
          lead_source:  lead_source   ?? null,
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
    console.log(`[ingest:billing] in=${result._usage.inputTokens} out=${result._usage.outputTokens} charged=$${deductionUsd.toFixed(5)} cost=$${providerCostUsd.toFixed(5)}`);

    await logUsage({
      company_id:       user.company_id,
      app:              "sales_coach",
      entity_id:        call.id,
      entity_type:      "live_call",
      input_tokens:     result._usage.inputTokens,
      output_tokens:    result._usage.outputTokens,
      cost_usd:         deductionUsd,
      model:            result._usage.model,
      provider_cost_usd: providerCostUsd,
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
      success:    true,
      call_id:    call.id,
      scorable:   result.scorable,
      score:      result.score,
      score_band: result.score_band,
      flags:      result.flags,
    },
    { status: 200 }
  );
}
