import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
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

type FlowType = "apn" | "dnc" | "skiptrace";

function detectFlowType(body: Record<string, unknown>): { flowType: FlowType; findOwner: boolean } | null {
  const raw = body.type as string | undefined;
  if (raw === "apn")               return { flowType: "apn",       findOwner: false };
  if (raw === "dnc")               return { flowType: "dnc",       findOwner: false };
  if (raw === "skiptrace")         return { flowType: "skiptrace", findOwner: false };
  if (raw === "address_skiptrace") return { flowType: "skiptrace", findOwner: true  };
  return null;
}

export async function POST(req: NextRequest) {
  console.log("[skip-tracing:ingest] ── incoming request ──────────────────────────");

  if (!verifySecret(req.headers.get("x-webhook-secret"))) {
    console.warn("[skip-tracing:ingest] unauthorized — bad or missing x-webhook-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const location_id  = body.location_id  as string | null | undefined;
  const contact_id   = body.contact_id   as string | null | undefined;
  const contact_name = (body.contact_name as string | null | undefined) ?? null;
  const lead_source  = (body.lead_source  as string | null | undefined) ?? null;
  const crm_link     = (body.crmLink      as string | null | undefined) ?? null;

  if (!location_id) {
    return NextResponse.json({ error: "Missing required field: location_id" }, { status: 400 });
  }

  const detected = detectFlowType(body);
  if (!detected) {
    return NextResponse.json({ error: "Missing or unrecognized 'type' field — expected apn, dnc, skiptrace, or address_skiptrace" }, { status: 400 });
  }
  const { flowType, findOwner } = detected;

  const admin = createAdminClient();

  // Resolve company by GHL sub-account ID
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .select("id, wallet_balance")
    .eq("ghl_sub_account_id", location_id)
    .maybeSingle();

  if (companyErr) {
    console.error("[skip-tracing:ingest] company lookup error:", companyErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!company) {
    return NextResponse.json({ error: `No company found for location_id ${location_id}` }, { status: 404 });
  }

  const hit             = (body.hit              as boolean) ?? false;
  const creditsDeducted = (body.credits_deducted as number)  ?? 0;
  const personsCount    = (body.persons_count    as number)  ?? 0;

  // Fetch per-flow charged prices — prefer company override, fall back to global
  const { data: cfgRows } = await admin
    .from("billing_config")
    .select("st_charged_normal_usd, st_charged_advanced_usd, st_charged_apn_usd, st_charged_dnc_usd, st_normal_rate_usd, st_advanced_rate_usd, st_apn_rate_usd, st_dnc_rate_usd, company_id")
    .eq("app", "skip_tracing")
    .or(`company_id.eq.${company.id},company_id.is.null`);
  const pr = (cfgRows?.find(r => r.company_id === company.id) ?? cfgRows?.find(r => r.company_id === null)) as Record<string, unknown> | null;
  // Normal = skiptrace without findOwner; Advanced = skiptrace with findOwner (address_skiptrace)
  const isAdvanced = flowType === "skiptrace" && findOwner;
  const chargedUsdPerHit =
    flowType === "apn"  ? Number(pr?.st_charged_apn_usd      ?? 0.10) :
    flowType === "dnc"  ? Number(pr?.st_charged_dnc_usd      ?? 0.02) :
    isAdvanced          ? Number(pr?.st_charged_advanced_usd ?? 0.04) :
                          Number(pr?.st_charged_normal_usd   ?? 0.02);
  const providerCostUsd =
    flowType === "apn"  ? Number(pr?.st_apn_rate_usd      ?? 0.10) :
    flowType === "dnc"  ? Number(pr?.st_dnc_rate_usd      ?? 0.02) :
    isAdvanced          ? Number(pr?.st_advanced_rate_usd ?? 0.04) :
                          Number(pr?.st_normal_rate_usd   ?? 0.02);

  const deductionUsd = chargedUsdPerHit;  // per hit, not per credit — one webhook = one hit

  console.log(`[skip-tracing:billing] flow=${flowType} advanced=${isAdvanced} charged=$${chargedUsdPerHit.toFixed(5)} cost=$${providerCostUsd.toFixed(5)}`);

  // Wallet pre-check only when credits will be deducted
  if (creditsDeducted > 0 && (company.wallet_balance ?? 0) <= 0) {
    console.warn("[skip-tracing:ingest] insufficient wallet balance for company:", company.id);
    return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
  }

  // Build log row — common fields
  const logRow: Record<string, unknown> = {
    company_id:        company.id,
    contact_id:        contact_id   ?? null,
    contact_name:      contact_name,
    flow_type:         flowType,
    hit,
    credits_deducted:  creditsDeducted,
    cost_usd:          deductionUsd,
    provider_cost_usd: providerCostUsd,
    persons_count:     personsCount,
    lead_source:       lead_source,
    crm_link:          crm_link,
    payload:           body,
  };

  // Extract type-specific indexed fields
  if (flowType === "apn") {
    logRow.parcel_id = body.parcel_id ?? null;
    logRow.county    = body.county    ?? null;
    logRow.state     = body.state     ?? null;
  } else if (flowType === "dnc") {
    logRow.phone        = body.phone        ?? null;
    logRow.is_clean     = body.is_clean     ?? null;
    logRow.national_dnc = body.national_dnc ?? null;
    logRow.state_dnc    = body.state_dnc    ?? null;
    logRow.dma          = body.dma          ?? null;
    logRow.litigator    = body.litigator    ?? null;
    logRow.phone_type   = body.phone_type   ?? null;
  } else {
    logRow.address    = body.address ?? null;
    logRow.city       = body.city    ?? null;
    logRow.state      = body.state   ?? null;
    logRow.zip        = body.zip     ?? null;
    logRow.find_owner = findOwner;
  }

  const { data: log, error: insertErr } = await admin
    .from("skip_tracing_logs")
    .insert(logRow)
    .select("id")
    .single();

  if (insertErr) {
    console.error("[skip-tracing:ingest] insert error:", insertErr.message);
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }

  // Deduct from wallet
  if (deductionUsd > 0) {
    const { data: newBalance, error: deductErr } = await admin.rpc("deduct_wallet_balance", {
      p_company_id:  company.id,
      p_amount_usd:  deductionUsd,
      p_description: `Skip trace (${flowType}) — ${creditsDeducted} credit${creditsDeducted !== 1 ? "s" : ""}`,
      p_app:         "skip_tracing",
    });
    if (deductErr) console.error("[skip-tracing:ingest] wallet deduction failed:", deductErr.message);
    else void autoTopupIfNeeded(company.id, Number(newBalance));
  }

  console.log(`[skip-tracing:ingest] saved ${log.id}, type=${flowType}, hit=${hit}, credits=${creditsDeducted}, cost=$${deductionUsd.toFixed(6)}`);
  return NextResponse.json({ success: true, log_id: log.id, flow_type: flowType, hit }, { status: 200 });
}
