import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function verifySecret(header: string | null): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !header) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(secret));
  } catch {
    return false;
  }
}

// Convert a raw GHL label to snake_case kpi_name when no config row exists.
// "Appointment Set" → "appointment_set", "Live Transfer Successful" → "live_transfer_successful"
function toSnakeCase(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Default rep attribution field when no kpi_pipeline_config row exists for this KPI.
function defaultRepField(kpiType: string): string {
  if (kpiType === "DISPO" || kpiType === "Owned & Rentals") return "dispo_manager";
  if (kpiType === "additional") return "ghl_user_name";
  return "acq_manager"; // ACQ default
}

interface KpiIngestPayload {
  // ── Company ─────────────────────────────────────────────────────────────────
  location_id:              string;

  // ── KPI classification ───────────────────────────────────────────────────────
  kpi:                      string;  // raw GHL label (e.g. "Appointment Set") → normalised to kpi_name
  kpi_type:                 string;  // "ACQ" | "DISPO" | "Owned & Rentals" | "additional"
  occurred_at:              string;  // ISO 8601

  // ── Contact ──────────────────────────────────────────────────────────────────
  contact_id:               string;
  contact_name?:            string;
  contact_email?:           string;
  contact_phone?:           string;
  contact_address?:         string;
  contact_type?:            string;
  crm_link?:                string;

  // ── Lead context ─────────────────────────────────────────────────────────────
  lead_source?:             string;
  campaign?:                string;
  stage?:                   string;
  quality?:                 string;

  // ── Rep names (raw GHL strings) ───────────────────────────────────────────────
  agent_name?:              string;
  ghl_user_name?:           string;
  acq_manager?:             string;
  acq_lead_manager?:        string;
  dispo_manager?:           string;
  dispo_lead_manager?:      string;
  transaction_coordinator?: string;

  // ── Deal / strategy ───────────────────────────────────────────────────────────
  initial_exit_strategy?:   string;
  final_exit_strategy?:     string;

  // ── Appointment ───────────────────────────────────────────────────────────────
  appointment_at?:          string;

  // ── DISPO-specific ────────────────────────────────────────────────────────────
  address_interested_in?:   string;
  potential_buyer_state?:   string;
  potential_buyer_city?:    string;
  current_showing_address?: string;
  current_showing_phone?:   string;

  // ── Financial ─────────────────────────────────────────────────────────────────
  potential_profit?:        string | number;
  marketing_price?:         string | number;
  reduction?:               string | number;

  // ── Idempotency ───────────────────────────────────────────────────────────────
  external_id?:             string;

  // ── Overflow ──────────────────────────────────────────────────────────────────
  [key: string]: unknown;
}

const KNOWN_FIELDS = new Set([
  "location_id", "kpi", "kpi_type", "occurred_at",
  "contact_id", "contact_name", "contact_email", "contact_phone", "contact_address", "contact_type", "crm_link",
  "lead_source", "campaign", "stage", "quality",
  "agent_name", "ghl_user_name", "acq_manager", "acq_lead_manager", "dispo_manager", "dispo_lead_manager", "transaction_coordinator",
  "initial_exit_strategy", "final_exit_strategy",
  "appointment_at",
  "address_interested_in", "potential_buyer_state", "potential_buyer_city", "current_showing_address", "current_showing_phone",
  "potential_profit", "marketing_price", "reduction",
  "external_id",
]);

function toNumericOrNull(v: string | number | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  console.log("[kpi:ingest] ── incoming request ────────────────────────");

  // 1. Auth
  const secret = req.headers.get("x-webhook-secret");
  if (!verifySecret(secret)) {
    console.warn("[kpi:ingest] unauthorized — bad or missing x-webhook-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: KpiIngestPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { location_id, kpi, kpi_type, occurred_at, contact_id } = body;

  if (!location_id || !kpi || !kpi_type || !occurred_at || !contact_id) {
    console.warn("[kpi:ingest] missing required fields", {
      location_id: !!location_id, kpi: !!kpi, kpi_type: !!kpi_type, occurred_at: !!occurred_at, contact_id: !!contact_id,
    });
    return NextResponse.json(
      { error: "Missing required fields: location_id, kpi, kpi_type, occurred_at, contact_id" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 3. Resolve company
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .select("id")
    .eq("ghl_sub_account_id", location_id)
    .maybeSingle();

  if (companyErr) {
    console.error("[kpi:ingest] company lookup error:", companyErr.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!company) {
    console.warn("[kpi:ingest] no company for location_id:", location_id);
    return NextResponse.json({ error: `No company found for location ID ${location_id}` }, { status: 404 });
  }

  // 4. Resolve kpi_name + rep_field from pipeline config (fall back to snake_case + type defaults)
  const { data: configRow } = await admin
    .from("kpi_pipeline_config")
    .select("kpi_name, rep_field")
    .eq("company_id", company.id)
    .eq("kpi_type", kpi_type)
    .ilike("ghl_kpi_label", kpi.trim())
    .maybeSingle();

  const kpi_name = configRow?.kpi_name ?? toSnakeCase(kpi);
  const rep_field = configRow?.rep_field ?? defaultRepField(kpi_type);

  console.log("[kpi:ingest] kpi:", kpi, "→ kpi_name:", kpi_name, "| kpi_type:", kpi_type, "| rep_field:", rep_field);

  // 5. Resolve user_id from the rep attribution field
  const repName = (body[rep_field] as string | undefined)?.trim() ?? null;
  let userId: string | null = null;

  if (repName) {
    const { data: userRow } = await admin
      .from("users")
      .select("id")
      .eq("company_id", company.id)
      .eq("is_active", true)
      .ilike("full_name", repName)
      .maybeSingle();

    userId = userRow?.id ?? null;
    if (!userId) {
      console.warn("[kpi:ingest] no user matched rep name:", repName, "for company:", company.id);
    }
  }

  // 6. Collect any extra fields that aren't mapped to explicit columns into metadata
  const metadata: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(body)) {
    if (!KNOWN_FIELDS.has(key) && val !== undefined && val !== null && val !== "") {
      metadata[key] = val;
    }
  }

  // 7. Insert (idempotent on company_id + external_id)
  const { data: inserted, error: insertErr } = await admin
    .from("kpi_events")
    .upsert(
      {
        company_id:               company.id,
        location_id:              location_id ?? null,
        contact_id,
        kpi_name,
        kpi_type,
        occurred_at,
        contact_name:             body.contact_name              ?? null,
        contact_email:            body.contact_email             ?? null,
        contact_phone:            body.contact_phone             ?? null,
        contact_address:          body.contact_address           ?? null,
        contact_type:             body.contact_type              ?? null,
        crm_link:                 body.crm_link                  ?? null,
        lead_source:              body.lead_source               ?? null,
        campaign:                 body.campaign                  ?? null,
        stage:                    body.stage                     ?? null,
        quality:                  body.quality                   ?? null,
        agent_name:               body.agent_name                ?? null,
        ghl_user_name:            body.ghl_user_name             ?? null,
        acq_manager:              body.acq_manager               ?? null,
        acq_lead_manager:         body.acq_lead_manager          ?? null,
        dispo_manager:            body.dispo_manager             ?? null,
        dispo_lead_manager:       body.dispo_lead_manager        ?? null,
        transaction_coordinator:  body.transaction_coordinator   ?? null,
        user_id:                  userId,
        initial_exit_strategy:    body.initial_exit_strategy     ?? null,
        final_exit_strategy:      body.final_exit_strategy       ?? null,
        appointment_at:           body.appointment_at            ?? null,
        address_interested_in:    body.address_interested_in     ?? null,
        potential_buyer_state:    body.potential_buyer_state     ?? null,
        potential_buyer_city:     body.potential_buyer_city      ?? null,
        current_showing_address:  body.current_showing_address   ?? null,
        current_showing_phone:    body.current_showing_phone     ?? null,
        potential_profit:         toNumericOrNull(body.potential_profit),
        marketing_price:          toNumericOrNull(body.marketing_price),
        reduction:                toNumericOrNull(body.reduction),
        external_id:              body.external_id               ?? null,
        metadata,
      },
      {
        onConflict: "company_id,external_id",
        ignoreDuplicates: true,
      }
    )
    .select("id")
    .single();

  if (insertErr) {
    // 23505 = unique_violation — the event was already inserted (idempotent retry)
    if (insertErr.code === "23505") {
      console.log("[kpi:ingest] duplicate external_id — skipped");
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    }
    console.error("[kpi:ingest] insert error:", insertErr.message);
    return NextResponse.json({ error: "Failed to save KPI event" }, { status: 500 });
  }

  console.log("[kpi:ingest] saved event id:", inserted?.id, "kpi_name:", kpi_name, "contact:", contact_id);
  console.log("[kpi:ingest] ────────────────────────────────────────────");

  return NextResponse.json(
    { success: true, id: inserted?.id, kpi_name, kpi_type },
    { status: 200 }
  );
}
