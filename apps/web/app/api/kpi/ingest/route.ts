import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { lookupEvent } from "@/lib/kpi/webhook-registry";

// ── Auth ───────────────────────────────────────────────────────────────────────

function verifySecret(header: string | null): boolean {
  const secret = process.env.KPI_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(secret));
  } catch {
    return false;
  }
}

// ── Standard field helpers ─────────────────────────────────────────────────────

interface StandardFields {
  full_name:    string | null;
  email:        string | null;
  date_created: string | null;
  contact_type: string | null;
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log("[kpi:ingest] ── incoming request ──────────────────────────────");

  if (!verifySecret(req.headers.get("x-webhook-secret"))) {
    console.warn("[kpi:ingest] unauthorized — bad or missing x-webhook-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Standard webhook: location and contact come from top-level body fields
  const location   = body.location as Record<string, unknown> | undefined;
  const location_id = location?.id as string | undefined;
  const contact_id  = body.contact_id as string | undefined;

  // All custom fields (including the type discriminator) live in customData
  const customData = (body.customData ?? {}) as Record<string, unknown>;
  const eventType  = customData.type as string | undefined;

  // Standard fields available to all handlers
  const std: StandardFields = {
    full_name:    (body.full_name    as string | null | undefined) ?? null,
    email:        (body.email        as string | null | undefined) ?? null,
    date_created: (body.date_created as string | null | undefined) ?? null,
    contact_type: (body.contact_type as string | null | undefined) ?? null,
  };

  console.log(`[kpi:ingest] type=${eventType ?? "(missing)"} location=${location_id ?? "(missing)"} contact=${contact_id ?? "(missing)"}`);

  if (!eventType) {
    return NextResponse.json({ error: "Missing required field: customData.type" }, { status: 400 });
  }
  if (!location_id) {
    return NextResponse.json({ error: "Missing required field: location.id" }, { status: 400 });
  }
  if (!contact_id) {
    return NextResponse.json({ error: "Missing required field: contact_id" }, { status: 400 });
  }

  // Unknown types are saved for visibility — never silently dropped
  const registryEntry = lookupEvent(eventType);
  if (!registryEntry) {
    console.warn(`[kpi:ingest] unrecognised type "${eventType}" — saving to kpi_unknown_events`);
    const admin = createAdminClient();
    await admin.from("kpi_unknown_events").insert({
      location_id,
      event_type: eventType,
      payload:    body,
    });
    return NextResponse.json({ received: true, handled: false, reason: "unknown_type" }, { status: 200 });
  }

  const admin = createAdminClient();

  // Resolve company
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("ghl_sub_account_id", location_id)
    .maybeSingle();

  if (!company) {
    console.warn(`[kpi:ingest] no company for location_id=${location_id}`);
    return NextResponse.json({ error: `No company found for location_id ${location_id}` }, { status: 404 });
  }

  if (eventType === "acq_leads") {
    return handleAcqLead(customData, std, company.id, location_id, contact_id, eventType, admin);
  }

  if (eventType === "dispo_leads") {
    return handleDispoLead(customData, std, company.id, location_id, contact_id, admin);
  }

  return NextResponse.json({ error: "No handler for this event type" }, { status: 500 });
}

// ── ACQ Lead handler (08.1 Lead Submission Form + 08.2 CSV Lead Submission) ───

async function handleAcqLead(
  cd:          Record<string, unknown>,   // customData
  std:         StandardFields,
  company_id:  string,
  location_id: string,
  contact_id:  string,
  event_type:  string,
  admin:       ReturnType<typeof createAdminClient>,
) {
  // Sanitize raw value — GHL sends '""' for unset custom fields (not yet created),
  // which arrives as the literal string '""'. Treat those as null.
  const clean = (v: unknown): string | null => {
    if (v === null || v === undefined || v === "" || v === '""') return null;
    const str = String(v).trim();
    return str === "" || str === '""' ? null : str;
  };
  const s = (k: string) => clean(cd[k]);
  const n = (k: string): number | null => {
    const v = clean(cd[k]);
    if (v === null) return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  };
  const d = (k: string, fallback?: string): string | null => {
    const v = clean(cd[k]) ?? (fallback ? clean(fallback) : null);
    if (!v) return null;
    const parsed = new Date(v);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  const occurred_at = d("datekpi") ?? new Date().toISOString();

  // Resolve user_id from acq manager name (best-effort)
  const acqName = s("acqmanager");
  let user_id: string | null = null;
  if (acqName) {
    const { data: matched } = await admin
      .from("users")
      .select("id")
      .eq("company_id", company_id)
      .ilike("full_name", acqName)
      .maybeSingle();
    user_id = matched?.id ?? null;
  }

  const row = {
    company_id,
    location_id,
    contact_id,
    kpi_name:    "lead",
    kpi_type:    "ACQ",
    occurred_at,

    // Standard fields
    contact_name:  std.full_name,
    contact_email: std.email,
    contact_type:  std.contact_type,

    // customData fields → dedicated columns
    crm_link:               s("crmlink"),
    contact_phone:          s("phone"),
    contact_address:        s("address"),
    lead_source:            s("leadsource"),
    campaign:               s("campaign"),
    call_count:             n("callcount"),
    stage:                  s("stage"),
    pipeline:               s("pipeline"),
    quality:                s("quality"),
    score:                  n("score"),
    feedback:               s("feedback"),
    agent_name:             s("agent"),
    ghl_user_name:          s("user"),
    acq_manager:            s("acqmanager"),
    acq_lead_manager:       s("acqleadmanager"),
    dispo_manager:          s("dispomanager"),
    dispo_lead_manager:     s("dispoleadmanager"),
    transaction_coordinator: s("transactioncoordinator"),
    underwriter:            s("underwriter"),
    fus:                    s("fus"),
    initial_exit_strategy:  s("initialexitstrategy"),
    final_exit_strategy:    s("finalexitstrategy"),
    temperature:            s("temperature"),
    appointment_at:         d("appointmentdateandtime"),
    reduction:              n("reduction"),
    actual_profit:          n("actualprofit"),
    potential_profit:       n("potentialprofit"),
    marketing_price:        n("marketingprice"),

    user_id,

    metadata: {
      source_automation: event_type,
      kpi_raw:           s("kpi"),
      date_created:      std.date_created,
    },
  };

  const { data: inserted, error } = await admin
    .from("kpi_events")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    console.error("[kpi:ingest] acq_leads insert error:", error.message);
    return NextResponse.json({ error: "Failed to save event" }, { status: 500 });
  }

  console.log(`[kpi:ingest] saved kpi_event ${inserted.id} — type=acq_leads contact=${contact_id} company=${company_id}`);
  return NextResponse.json({ received: true, event_id: inserted.id }, { status: 200 });
}

// ── DISPO lead handler (00.0 - Potential Buyer Created) ───────────────────────

async function handleDispoLead(
  cd:          Record<string, unknown>,
  std:         StandardFields,
  company_id:  string,
  location_id: string,
  contact_id:  string,
  admin:       ReturnType<typeof createAdminClient>,
) {
  const clean = (v: unknown): string | null => {
    if (v === null || v === undefined || v === "" || v === '""') return null;
    const str = String(v).trim();
    return str === "" || str === '""' ? null : str;
  };
  const s = (k: string) => clean(cd[k]);
  const n = (k: string): number | null => {
    const v = clean(cd[k]);
    if (v === null) return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  };
  const d = (k: string): string | null => {
    const v = clean(cd[k]);
    if (!v) return null;
    const parsed = new Date(v);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  const occurred_at = d("datekpi") ?? new Date().toISOString();

  // Resolve user_id from dispo manager name (best-effort)
  const dispoName = s("dispomanager");
  let user_id: string | null = null;
  if (dispoName) {
    const { data: matched } = await admin
      .from("users")
      .select("id")
      .eq("company_id", company_id)
      .ilike("full_name", dispoName)
      .maybeSingle();
    user_id = matched?.id ?? null;
  }

  const row = {
    company_id,
    location_id,
    contact_id,
    kpi_name:    "lead",
    kpi_type:    "DISPO",
    occurred_at,

    // Standard fields
    contact_name:  std.full_name,
    contact_email: std.email,
    contact_type:  std.contact_type,

    // Shared customData fields (same keys as acq_leads)
    crm_link:               s("crmlink"),
    contact_phone:          s("phone"),
    contact_address:        s("address"),
    lead_source:            s("leadsource"),
    campaign:               s("campaign"),
    call_count:             n("callcount"),
    stage:                  s("stage"),
    pipeline:               s("pipeline"),
    quality:                s("quality"),
    score:                  n("score"),
    feedback:               s("feedback"),
    agent_name:             s("agent"),
    ghl_user_name:          s("user"),
    acq_manager:            s("acqmanager"),
    acq_lead_manager:       s("acqleadmanager"),
    dispo_manager:          s("dispomanager"),
    dispo_lead_manager:     s("dispoleadmanager"),
    transaction_coordinator: s("transactioncoordinator"),
    underwriter:            s("underwriter"),
    fus:                    s("fus"),
    initial_exit_strategy:  s("initialexitstrategy"),
    final_exit_strategy:    s("finalexitstrategy"),
    temperature:            s("temperature"),
    appointment_at:         d("appointmentdateandtime"),
    reduction:              n("reduction"),
    actual_profit:          n("actualprofit"),
    potential_profit:       n("potentialprofit"),
    marketing_price:        n("marketingprice"),

    // DISPO-specific fields
    address_interested_in:    s("addressinterested"),
    potential_buyer_city:     s("potentialbuyercity"),
    potential_buyer_state:    s("potentialbuyerstate"),
    current_showing_address:  s("currentshowingaddress"),
    current_showing_phone:    s("currentshowingphonenumber"),

    user_id,

    metadata: {
      source_automation: "dispo_leads",
      kpi_raw:           s("kpi"),
      date_created:      std.date_created,
    },
  };

  const { data: inserted, error } = await admin
    .from("kpi_events")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    console.error("[kpi:ingest] dispo_leads insert error:", error.message);
    return NextResponse.json({ error: "Failed to save event" }, { status: 500 });
  }

  console.log(`[kpi:ingest] saved kpi_event ${inserted.id} — type=dispo_leads contact=${contact_id} company=${company_id}`);
  return NextResponse.json({ received: true, event_id: inserted.id }, { status: 200 });
}
