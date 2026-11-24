/**
 * KPI Webhook Registry
 *
 * Single source of truth for every GHL automation that sends data to /api/kpi/ingest.
 *
 * GHL standard webhook is used. Each payload has two parts:
 *   - Standard fields: GHL sends these automatically on the top-level body
 *     (contact_id, full_name, email, date_created, contact_type, location.id)
 *   - customData fields: everything we configure manually in GHL's customData object,
 *     including the `type` discriminator the route uses to dispatch to the right handler
 *
 * When adding a new automation:
 *   1. Add an entry here (standard_fields + custom_fields sections)
 *   2. Handle the new `type` in /api/kpi/ingest/route.ts
 *   3. Update status to "live" once tested end-to-end
 *
 * Status: planned → built → live
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface WebhookField {
  source:   "standard" | "customData"; // where in the payload this field lives
  type:     "string" | "number" | "date" | "boolean";
  required: boolean;
  maps_to:  string;   // kpi_events column name, e.g. "acq_manager" or "metadata.kpi_raw"
  notes?:   string;
}

export interface WebhookEvent {
  type:        string;
  ghl_folder:  string;
  ghl_name:    string;
  kpi_name:    string;
  kpi_type:    "ACQ" | "DISPO" | "Owned & Rentals" | "additional";
  status:      "planned" | "built" | "live";
  description: string;
  fields:      Record<string, WebhookField>;
}

export const WEBHOOK_REGISTRY: Record<string, WebhookEvent> = {

  // ── 00 - Notifications & Contact/Opps › 02 - Lead Contacts ──────────────────

  "acq_leads": {
    type:        "acq_leads",
    ghl_folder:  "00 - Notifications & Contact/Opps / 02 - Lead Contacts",
    ghl_name:    "08.1 - Lead Submission Form  |  08.2 - CSV Lead Submission",
    kpi_name:    "lead",
    kpi_type:    "ACQ",
    status:      "built",
    description: "Fires when a new ACQ lead is submitted via the lead submission form (08.1) or CSV bulk import (08.2). Both automations share this type.",

    fields: {
      // ── Standard body fields (GHL sends automatically) ─────────────────────
      contact_id: {
        source:   "standard",
        type:     "string",
        required: true,
        maps_to:  "contact_id",
        notes:    "body.contact_id",
      },
      location_id: {
        source:   "standard",
        type:     "string",
        required: true,
        maps_to:  "location_id",
        notes:    "body.location.id — used to resolve company_id",
      },
      full_name: {
        source:   "standard",
        type:     "string",
        required: false,
        maps_to:  "contact_name",
        notes:    "body.full_name",
      },
      email: {
        source:   "standard",
        type:     "string",
        required: false,
        maps_to:  "contact_email",
        notes:    "body.email",
      },
      date_created: {
        source:   "standard",
        type:     "date",
        required: false,
        maps_to:  "metadata.date_created",
        notes:    "body.date_created — GHL contact creation time",
      },
      contact_type: {
        source:   "standard",
        type:     "string",
        required: false,
        maps_to:  "contact_type",
        notes:    "body.contact_type",
      },

      // ── customData fields (configured manually in GHL) ──────────────────────
      type: {
        source:   "customData",
        type:     "string",
        required: true,
        maps_to:  "metadata.source_automation",
        notes:    "Discriminator — must be exactly 'acq_leads'",
      },
      crmlink: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "crm_link",
      },
      datekpi: {
        source:   "customData",
        type:     "date",
        required: true,
        maps_to:  "occurred_at",
        notes:    "KPI event date; falls back to ingest time if missing",
      },
      kpi: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "metadata.kpi_raw",
        notes:    "Raw GHL KPI label — kpi_name is hardcoded to 'lead' for this automation",
      },
      phone: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "contact_phone",
      },
      address: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "contact_address",
        notes:    "Property address (full_address_2), not the contact's mailing address",
      },
      leadsource: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "lead_source",
      },
      campaign: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "campaign",
      },
      callcount: {
        source:   "customData",
        type:     "number",
        required: false,
        maps_to:  "call_count",
      },
      stage: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "stage",
      },
      pipeline: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "pipeline",
      },
      quality: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "quality",
        notes:    "Pending | Qualified | Disqualified",
      },
      score: {
        source:   "customData",
        type:     "number",
        required: false,
        maps_to:  "score",
      },
      feedback: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "feedback",
      },
      agent: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "agent_name",
        notes:    "Lead agent / marketing agent",
      },
      user: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "ghl_user_name",
        notes:    "GHL user assigned to this contact",
      },
      acqmanager: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "acq_manager",
        notes:    "ACQ closer — ingest route attempts user_id resolution via full_name match",
      },
      acqleadmanager: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "acq_lead_manager",
      },
      dispomanager: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "dispo_manager",
      },
      dispoleadmanager: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "dispo_lead_manager",
      },
      transactioncoordinator: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "transaction_coordinator",
      },
      underwriter: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "underwriter",
      },
      fus: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "fus",
        notes:    "Follow-Up Specialist name",
      },
      initialexitstrategy: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "initial_exit_strategy",
      },
      finalexitstrategy: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "final_exit_strategy",
      },
      temperature: {
        source:   "customData",
        type:     "string",
        required: false,
        maps_to:  "temperature",
        notes:    "Lead temperature e.g. Hot | Warm | Cold",
      },
      appointmentdateandtime: {
        source:   "customData",
        type:     "date",
        required: false,
        maps_to:  "appointment_at",
      },
      reduction: {
        source:   "customData",
        type:     "number",
        required: false,
        maps_to:  "reduction",
      },
      actualprofit: {
        source:   "customData",
        type:     "number",
        required: false,
        maps_to:  "actual_profit",
      },
      potentialprofit: {
        source:   "customData",
        type:     "number",
        required: false,
        maps_to:  "potential_profit",
      },
      marketingprice: {
        source:   "customData",
        type:     "number",
        required: false,
        maps_to:  "marketing_price",
      },
    },
  },

  // ── 00 - Notifications & Contact/Opps › 03 - Potential Buyers ──────────────

  "dispo_leads": {
    type:        "dispo_leads",
    ghl_folder:  "00 - Notifications & Contact/Opps / 03 - Potential Buyers / 00.0 - Potential Buyer Created",
    ghl_name:    "00.0 - Potential Buyer Created",
    kpi_name:    "lead",
    kpi_type:    "DISPO",
    status:      "built",
    description: "Fires when a new potential buyer (DISPO lead) is created in GHL.",
    fields: {
      // ── Standard fields ─────────────────────────────────────────────────────
      contact_id: {
        source:   "standard",
        type:     "string",
        required: true,
        maps_to:  "contact_id",
        notes:    "body.contact_id",
      },
      location_id: {
        source:   "standard",
        type:     "string",
        required: true,
        maps_to:  "location_id",
        notes:    "body.location.id",
      },
      full_name: {
        source:   "standard",
        type:     "string",
        required: false,
        maps_to:  "contact_name",
        notes:    "body.full_name",
      },
      email: {
        source:   "standard",
        type:     "string",
        required: false,
        maps_to:  "contact_email",
        notes:    "body.email",
      },
      date_created: {
        source:   "standard",
        type:     "date",
        required: false,
        maps_to:  "metadata.date_created",
        notes:    "body.date_created",
      },

      // ── customData fields (shared with acq_leads) ───────────────────────────
      type: {
        source:   "customData",
        type:     "string",
        required: true,
        maps_to:  "metadata.source_automation",
        notes:    "Must be exactly 'dispo_leads'",
      },
      crmlink:               { source: "customData", type: "string",  required: false, maps_to: "crm_link" },
      datekpi:               { source: "customData", type: "date",    required: true,  maps_to: "occurred_at", notes: "Falls back to ingest time if missing" },
      kpi:                   { source: "customData", type: "string",  required: false, maps_to: "metadata.kpi_raw" },
      phone:                 { source: "customData", type: "string",  required: false, maps_to: "contact_phone" },
      address:               { source: "customData", type: "string",  required: false, maps_to: "contact_address" },
      leadsource:            { source: "customData", type: "string",  required: false, maps_to: "lead_source" },
      campaign:              { source: "customData", type: "string",  required: false, maps_to: "campaign" },
      callcount:             { source: "customData", type: "number",  required: false, maps_to: "call_count" },
      stage:                 { source: "customData", type: "string",  required: false, maps_to: "stage" },
      pipeline:              { source: "customData", type: "string",  required: false, maps_to: "pipeline" },
      quality:               { source: "customData", type: "string",  required: false, maps_to: "quality", notes: "Pending / Qualified / Disqualified" },
      score:                 { source: "customData", type: "number",  required: false, maps_to: "score" },
      feedback:              { source: "customData", type: "string",  required: false, maps_to: "feedback" },
      agent:                 { source: "customData", type: "string",  required: false, maps_to: "agent_name" },
      user:                  { source: "customData", type: "string",  required: false, maps_to: "ghl_user_name" },
      acqmanager:            { source: "customData", type: "string",  required: false, maps_to: "acq_manager" },
      acqleadmanager:        { source: "customData", type: "string",  required: false, maps_to: "acq_lead_manager" },
      dispomanager:          { source: "customData", type: "string",  required: false, maps_to: "dispo_manager", notes: "Primary attribution — ingest attempts user_id resolution" },
      dispoleadmanager:      { source: "customData", type: "string",  required: false, maps_to: "dispo_lead_manager" },
      transactioncoordinator:{ source: "customData", type: "string",  required: false, maps_to: "transaction_coordinator" },
      underwriter:           { source: "customData", type: "string",  required: false, maps_to: "underwriter" },
      fus:                   { source: "customData", type: "string",  required: false, maps_to: "fus", notes: "Follow-Up Specialist name" },
      initialexitstrategy:   { source: "customData", type: "string",  required: false, maps_to: "initial_exit_strategy" },
      finalexitstrategy:     { source: "customData", type: "string",  required: false, maps_to: "final_exit_strategy" },
      temperature:           { source: "customData", type: "string",  required: false, maps_to: "temperature" },
      appointmentdateandtime:{ source: "customData", type: "date",    required: false, maps_to: "appointment_at" },
      reduction:             { source: "customData", type: "number",  required: false, maps_to: "reduction" },
      actualprofit:          { source: "customData", type: "number",  required: false, maps_to: "actual_profit" },
      potentialprofit:       { source: "customData", type: "number",  required: false, maps_to: "potential_profit" },
      marketingprice:        { source: "customData", type: "number",  required: false, maps_to: "marketing_price" },

      // ── DISPO-specific fields ───────────────────────────────────────────────
      addressinterested:         { source: "customData", type: "string", required: false, maps_to: "address_interested_in" },
      potentialbuyercity:        { source: "customData", type: "string", required: false, maps_to: "potential_buyer_city" },
      potentialbuyerstate:       { source: "customData", type: "string", required: false, maps_to: "potential_buyer_state" },
      currentshowingaddress:     { source: "customData", type: "string", required: false, maps_to: "current_showing_address" },
      currentshowingphonenumber: { source: "customData", type: "string", required: false, maps_to: "current_showing_phone" },
    },
  },

  // ── Add future automations below ─────────────────────────────────────────────

} as const satisfies Record<string, WebhookEvent>;

export type KpiWebhookType = keyof typeof WEBHOOK_REGISTRY;

export function lookupEvent(type: string): WebhookEvent | null {
  return WEBHOOK_REGISTRY[type] ?? null;
}
