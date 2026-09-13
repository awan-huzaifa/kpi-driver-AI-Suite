-- ─────────────────────────────────────────────────────────────────────────────
-- 055_kpi_dashboard.sql
-- KPI Dashboard: event log + pipeline config + user access flag
--
-- kpi_name values (ACQ): lead | lead_assigned | appointment_set |
--   live_transfer_successful | live_transfer_unsuccessful | appointment_held |
--   no_show | appointment_cancelled | offer_made | rejected_offer |
--   contract_sent | contract_rejected | contract_signed | closed_deal |
--   cancelled_deal
--
-- kpi_name values (DISPO): lead | lead_assigned | interested |
--   showing_requested | showing_set | showing_held | no_show |
--   showing_cancelled | offer_received | offer_rejected |
--   contract_sent_received | contract_signed | contract_rejected |
--   closed_deal | cancelled_deal |
--   contract_signed_owned_rentals | closed_deal_owned_rentals
--
-- kpi_name values (additional): speed_to_lead | connection_rate |
--   conversations | date_qualified | total_calls | unique_leads |
--   avg_duration | sms_sent | talk_time | missed_calls | speed_to_all_metrics
--
-- Conversion ratios are NOT stored — computed on the fly from kpi_events.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. App access flag ───────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_kpi_dashboard boolean NOT NULL DEFAULT false;

UPDATE users SET app_kpi_dashboard = true
WHERE access_role IN ('admin', 'super_admin');

-- ── 2. kpi_events ────────────────────────────────────────────────────────────
-- One row per KPI trigger received from GHL.
-- GHL sends the KPI name and type directly in the webhook payload.
-- Conversion ratios (Lead → Closed Deal etc.) are calculated on query.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_events (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- ── GHL identifiers ───────────────────────────────────────────────────────
  location_id               text,                          -- GHL sub-account ID (reference copy)
  contact_id                text        NOT NULL,          -- {{contact.id}}

  -- ── KPI classification ────────────────────────────────────────────────────
  -- GHL sends these directly; ingest route normalises to snake_case
  kpi_name                  text        NOT NULL,          -- e.g. 'lead', 'appointment_set', 'closed_deal'
  kpi_type                  text        NOT NULL           -- see CHECK below
                            CHECK (kpi_type IN ('ACQ', 'DISPO', 'Owned & Rentals', 'additional')),

  -- ── Timing ────────────────────────────────────────────────────────────────
  occurred_at               timestamptz NOT NULL,          -- Date KPI field from GHL webhook
  created_at                timestamptz NOT NULL DEFAULT now(),

  -- ── Contact info (from GHL payload) ──────────────────────────────────────
  contact_name              text,                          -- {{contact.name}}
  contact_email             text,                          -- {{contact.email}}
  contact_phone             text,                          -- {{contact.phone}}
  contact_address           text,                          -- {{contact.full_address_2}}
  contact_type              text,                          -- {{contact.type}}
  crm_link                  text,                          -- full CRM URL for click-through

  -- ── Lead context ──────────────────────────────────────────────────────────
  lead_source               text,                          -- {{contact.lead_source}}
  campaign                  text,                          -- {{contact.campaign}}
  stage                     text,                          -- {{contact.stage}}
  quality                   text,                          -- {{contact.quality}} — Pending | Qualified | Disqualified

  -- ── Rep attribution (raw name strings as GHL sends them) ─────────────────
  -- Ingest route resolves the relevant field to user_id via users.full_name match
  agent_name                text,                          -- {{contact.lead_agent}}
  ghl_user_name             text,                          -- {{user.name}} — GHL user who triggered the flow
  acq_manager               text,                          -- {{contact.acq_manager}}
  acq_lead_manager          text,                          -- {{contact.acq_lead_manager}}
  dispo_manager             text,                          -- {{contact.dispo_manager}}
  dispo_lead_manager        text,                          -- {{contact.dispo_lead_manager}}
  transaction_coordinator   text,                          -- {{contact.transaction_coordinator}}

  -- Resolved FK — set by ingest route after name matching
  user_id                   uuid        REFERENCES users(id) ON DELETE SET NULL,

  -- ── Deal / exit strategy ──────────────────────────────────────────────────
  initial_exit_strategy     text,                          -- {{contact.initial_exit_strategy}}
  final_exit_strategy       text,                          -- {{contact.final_exit_strategy}}

  -- ── Appointment context ───────────────────────────────────────────────────
  appointment_at            timestamptz,                   -- {{appointment.start_time}}

  -- ── DISPO-specific fields ─────────────────────────────────────────────────
  address_interested_in     text,                          -- {{contact.addresses_interested_in}}
  potential_buyer_state     text,                          -- {{contact.potential_buyer_state}}
  potential_buyer_city      text,                          -- {{contact.potential_buyer_city}}
  current_showing_address   text,                          -- {{contact.current_showing_address}}
  current_showing_phone     text,                          -- {{contact.current_showing_phone_number}}

  -- ── Financial fields ──────────────────────────────────────────────────────
  potential_profit          numeric(14,2),                 -- {{contact.potential_profit}}
  marketing_price           numeric(14,2),                 -- {{contact.marketing_price}}
  reduction                 numeric(14,2),                 -- {{contact.reduction}} (price reduction amount)

  -- ── Idempotency ───────────────────────────────────────────────────────────
  -- GHL may retry webhook delivery; external_id prevents duplicate inserts.
  -- NULL values are excluded from the uniqueness constraint (SQL standard).
  external_id               text,
  UNIQUE (company_id, external_id),

  -- ── Overflow ──────────────────────────────────────────────────────────────
  metadata                  jsonb       NOT NULL DEFAULT '{}'  -- any additional fields from GHL payload
);

-- Indexes for common dashboard query patterns
CREATE INDEX IF NOT EXISTS kpi_events_company_occurred  ON kpi_events (company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS kpi_events_company_kpi_type  ON kpi_events (company_id, kpi_type, kpi_name);
CREATE INDEX IF NOT EXISTS kpi_events_user_occurred     ON kpi_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS kpi_events_contact           ON kpi_events (company_id, contact_id);
CREATE INDEX IF NOT EXISTS kpi_events_lead_source       ON kpi_events (company_id, lead_source);
CREATE INDEX IF NOT EXISTS kpi_events_campaign          ON kpi_events (company_id, campaign);
CREATE INDEX IF NOT EXISTS kpi_events_quality           ON kpi_events (company_id, quality);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE kpi_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kpi_events_select_super_admin ON kpi_events;
CREATE POLICY kpi_events_select_super_admin ON kpi_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.access_role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS kpi_events_select_admin ON kpi_events;
CREATE POLICY kpi_events_select_admin ON kpi_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id        = auth.uid()
        AND u.access_role = 'admin'
        AND u.company_id  = kpi_events.company_id
    )
  );

DROP POLICY IF EXISTS kpi_events_select_user ON kpi_events;
CREATE POLICY kpi_events_select_user ON kpi_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id        = auth.uid()
        AND u.access_role = 'user'
        AND u.company_id  = kpi_events.company_id
    )
    AND user_id = auth.uid()
  );

-- ── 3. kpi_pipeline_config ───────────────────────────────────────────────────
-- Maps the raw GHL KPI label text → our normalised kpi_name + kpi_type.
-- Also records which rep field to use for attribution per KPI.
-- One row per GHL label per company.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_pipeline_config (
  id              uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid  NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  kpi_type        text  NOT NULL
                  CHECK (kpi_type IN ('ACQ', 'DISPO', 'Owned & Rentals', 'additional')),

  kpi_name        text  NOT NULL,   -- our normalised snake_case name stored in kpi_events.kpi_name

  -- The exact text GHL sends in the KPI field of the webhook payload
  -- e.g. "Appointment Set", "Closed Deal", "Live Transfer Successful"
  ghl_kpi_label   text  NOT NULL,

  -- Which rep attribution field from kpi_events to use when crediting this KPI to a user
  rep_field       text  NOT NULL DEFAULT 'acq_manager'
                  CHECK (rep_field IN (
                    'acq_manager',
                    'acq_lead_manager',
                    'dispo_manager',
                    'dispo_lead_manager',
                    'agent_name',
                    'ghl_user_name'
                  )),

  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (company_id, kpi_type, ghl_kpi_label)
);

CREATE INDEX IF NOT EXISTS kpi_pipeline_config_company ON kpi_pipeline_config (company_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE kpi_pipeline_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kpi_pipeline_config_super_admin ON kpi_pipeline_config;
CREATE POLICY kpi_pipeline_config_super_admin ON kpi_pipeline_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.access_role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS kpi_pipeline_config_admin ON kpi_pipeline_config;
CREATE POLICY kpi_pipeline_config_admin ON kpi_pipeline_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id        = auth.uid()
        AND u.access_role = 'admin'
        AND u.company_id  = kpi_pipeline_config.company_id
    )
  );

DROP POLICY IF EXISTS kpi_pipeline_config_user_read ON kpi_pipeline_config;
CREATE POLICY kpi_pipeline_config_user_read ON kpi_pipeline_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id       = auth.uid()
        AND u.company_id = kpi_pipeline_config.company_id
    )
  );

-- ── 4. call_logs ─────────────────────────────────────────────────────────────
-- One row per GHL call log entry. Inbound or outbound, any rep.
-- Missed calls = status 'no_answer' + direction 'inbound'.
-- Conversations = duration_sec > 120.
-- Avg duration computed at query time over completed calls only.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- ── GHL identifiers ────────────────────────────────────────────────────────
  location_id     text,                          -- GHL sub-account ID (reference copy)
  contact_id      text        NOT NULL,          -- GHL contact ID
  contact_name    text,                          -- {{contact.name}}

  -- ── Call classification ─────────────────────────────────────────────────────
  direction       text        NOT NULL
                  CHECK (direction IN ('inbound', 'outbound')),
  status          text        NOT NULL
                  CHECK (status IN ('completed', 'busy', 'voicemail', 'no_answer')),
  duration_sec    integer     NOT NULL DEFAULT 0,

  -- ── Timing ──────────────────────────────────────────────────────────────────
  occurred_at     timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- ── Number info ─────────────────────────────────────────────────────────────
  from_number     text,
  to_number       text,

  -- ── Rep attribution ─────────────────────────────────────────────────────────
  ghl_user_name   text,                          -- raw name from GHL payload
  user_id         uuid        REFERENCES users(id) ON DELETE SET NULL,

  -- ── Lead context ────────────────────────────────────────────────────────────
  lead_source     text,

  -- ── Idempotency ─────────────────────────────────────────────────────────────
  external_id     text,
  UNIQUE (company_id, external_id),

  -- ── Overflow ────────────────────────────────────────────────────────────────
  metadata        jsonb       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS call_logs_company_occurred  ON call_logs (company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS call_logs_company_contact   ON call_logs (company_id, contact_id);
CREATE INDEX IF NOT EXISTS call_logs_user_occurred     ON call_logs (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS call_logs_lead_source       ON call_logs (company_id, lead_source);
CREATE INDEX IF NOT EXISTS call_logs_direction_status  ON call_logs (company_id, direction, status);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS call_logs_select_super_admin ON call_logs;
CREATE POLICY call_logs_select_super_admin ON call_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.access_role = 'super_admin')
  );

DROP POLICY IF EXISTS call_logs_select_admin ON call_logs;
CREATE POLICY call_logs_select_admin ON call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.access_role = 'admin' AND u.company_id = call_logs.company_id
    )
  );

DROP POLICY IF EXISTS call_logs_select_user ON call_logs;
CREATE POLICY call_logs_select_user ON call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.access_role = 'user' AND u.company_id = call_logs.company_id
    )
    AND user_id = auth.uid()
  );
