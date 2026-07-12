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

interface EnrichmentField {
  key:   string;
  value: unknown;
}

interface EnrichmentPayload {
  location_id: string | null;
  record_id?:  string | null;  // contact ID + idempotency key
  name?:       string | null;  // contact name
  fields:      EnrichmentField[];
}

export async function POST(req: NextRequest) {
  console.log("[data-enrichment:ingest] ── incoming request ──────────────────────────");

  if (!verifySecret(req.headers.get("x-webhook-secret"))) {
    console.warn("[data-enrichment:ingest] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: EnrichmentPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { location_id, record_id, name, fields } = body;

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
    console.error("[data-enrichment:ingest] company lookup error:", companyErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!company) {
    return NextResponse.json({ error: `No company found for location_id ${location_id}` }, { status: 404 });
  }

  // Wallet pre-check
  if ((company.wallet_balance ?? 0) <= 0) {
    console.warn("[data-enrichment:ingest] insufficient wallet balance for company:", company.id);
    return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
  }

  // Axesso cost — €15 / 10,000 calls ≈ $0.0016 per call
  const AXESSO_COST_USD = 0.0016;

  // Fetch billing multiplier — prefer company-specific override, fall back to global
  const { data: cfgRows } = await admin
    .from("billing_config")
    .select("multiplier, company_id")
    .eq("app", "data_enrichment")
    .or(`company_id.eq.${company.id},company_id.is.null`);
  const companyCfg   = cfgRows?.find(r => r.company_id === company.id);
  const globalCfg    = cfgRows?.find(r => r.company_id === null);
  const multiplier   = Number(companyCfg?.multiplier ?? globalCfg?.multiplier ?? 3.0);
  const deductionUsd = AXESSO_COST_USD * multiplier;

  // Insert — idempotent on external_id
  const { data: log, error: insertErr } = await admin
    .from("data_enrichment_logs")
    .insert({
      company_id:   company.id,
      external_id:  record_id ?? null,
      contact_name: name ?? null,
      fields:       fields ?? [],
      cost_usd:     deductionUsd,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    }
    console.error("[data-enrichment:ingest] insert error:", insertErr.message);
    return NextResponse.json({ error: "Failed to save enrichment log" }, { status: 500 });
  }

  // Deduct from wallet
  const { data: newBalance, error: deductErr } = await admin.rpc("deduct_wallet_balance", {
    p_company_id:  company.id,
    p_amount_usd:  deductionUsd,
    p_description: "Data enrichment lookup",
    p_app:         "data_enrichment",
  });
  if (deductErr) console.error("[data-enrichment:ingest] wallet deduction failed:", deductErr.message);
  else void autoTopupIfNeeded(company.id, Number(newBalance));

  void logUsage({
    company_id:    company.id,
    app:           "data_enrichment",
    entity_id:     log.id,
    entity_type:   "data_enrichment_log",
    input_tokens:  0,
    output_tokens: 0,
    cost_usd:      deductionUsd,
    model:         "axesso",
  });

  console.log(`[data-enrichment:ingest] saved log ${log.id}, ${fields?.length ?? 0} fields, cost $${deductionUsd.toFixed(6)}`);
  return NextResponse.json({ success: true, log_id: log.id }, { status: 200 });
}
