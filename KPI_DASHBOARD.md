# KPI Dashboard — Build Log

Tracks every decision, file, and step for the KPI Dashboard app.
Append new entries at the top (newest first).

---

## Step 1 — Database Migration ✅
**File:** `supabase/migrations/055_kpi_dashboard.sql`
**Status:** Written. Needs to be run in Supabase SQL editor.

### What it does
- Adds `app_kpi_dashboard boolean` to `users` table (default false, auto-true for existing admins/super_admins)
- Creates `kpi_events` table — one row per KPI trigger received from GHL
- Creates `kpi_pipeline_config` table — maps raw GHL KPI label text → our normalised `kpi_name` + `kpi_type` per company

### kpi_events columns
| Column | Source | Notes |
|--------|--------|-------|
| `company_id` | resolved from `location_id` | FK to `companies` |
| `location_id` | `{{location.id}}` | GHL sub-account ID |
| `contact_id` | `{{contact.id}}` | GHL contact ID |
| `kpi_name` | `KPI` field (normalised) | snake_case, see values below |
| `kpi_type` | `TYPE` field | ACQ / DISPO / Owned & Rentals / additional |
| `occurred_at` | `Date KPI` field | when event happened in GHL |
| `contact_name` | `{{contact.name}}` | |
| `contact_email` | `{{contact.email}}` | |
| `contact_phone` | `{{contact.phone}}` | |
| `contact_address` | `{{contact.full_address_2}}` | |
| `contact_type` | `{{contact.type}}` | |
| `crm_link` | constructed CRM URL | click-through in dashboard |
| `lead_source` | `{{contact.lead_source}}` | filter dimension |
| `campaign` | `{{contact.campaign}}` | filter dimension |
| `stage` | `{{contact.stage}}` | |
| `quality` | `{{contact.quality}}` | Pending / Qualified / Disqualified |
| `agent_name` | `{{contact.lead_agent}}` | raw GHL string |
| `ghl_user_name` | `{{user.name}}` | GHL user who triggered the flow |
| `acq_manager` | `{{contact.acq_manager}}` | raw GHL string |
| `acq_lead_manager` | `{{contact.acq_lead_manager}}` | raw GHL string |
| `dispo_manager` | `{{contact.dispo_manager}}` | raw GHL string |
| `dispo_lead_manager` | `{{contact.dispo_lead_manager}}` | raw GHL string |
| `transaction_coordinator` | `{{contact.transaction_coordinator}}` | raw GHL string |
| `user_id` | resolved by ingest route | FK to `users` via full_name match |
| `initial_exit_strategy` | `{{contact.initial_exit_strategy}}` | |
| `final_exit_strategy` | `{{contact.final_exit_strategy}}` | |
| `appointment_at` | `{{appointment.start_time}}` | |
| `address_interested_in` | `{{contact.addresses_interested_in}}` | DISPO |
| `potential_buyer_state` | `{{contact.potential_buyer_state}}` | DISPO |
| `potential_buyer_city` | `{{contact.potential_buyer_city}}` | DISPO |
| `current_showing_address` | `{{contact.current_showing_address}}` | DISPO |
| `current_showing_phone` | `{{contact.current_showing_phone_number}}` | DISPO |
| `potential_profit` | `{{contact.potential_profit}}` | financial |
| `marketing_price` | `{{contact.marketing_price}}` | financial |
| `reduction` | `{{contact.reduction}}` | financial |
| `external_id` | GHL event ID | idempotency — unique per company |
| `metadata` | JSONB | overflow for any extra GHL fields |

### kpi_name reference

**ACQ (15 raw events):**
`lead` · `lead_assigned` · `appointment_set` · `live_transfer_successful` · `live_transfer_unsuccessful` · `appointment_held` · `no_show` · `appointment_cancelled` · `offer_made` · `rejected_offer` · `contract_sent` · `contract_rejected` · `contract_signed` · `closed_deal` · `cancelled_deal`

**DISPO (17 raw events):**
`lead` · `lead_assigned` · `interested` · `showing_requested` · `showing_set` · `showing_held` · `no_show` · `showing_cancelled` · `offer_received` · `offer_rejected` · `contract_sent_received` · `contract_signed` · `contract_rejected` · `closed_deal` · `cancelled_deal` · `contract_signed_owned_rentals` · `closed_deal_owned_rentals`

**Additional (11 raw events):**
`speed_to_lead` · `connection_rate` · `conversations` · `date_qualified` · `total_calls` · `unique_leads` · `avg_duration` · `sms_sent` · `talk_time` · `missed_calls` · `speed_to_all_metrics`

**Conversion ratios** — NOT stored, computed on query from `kpi_events`. 56 for ACQ, 77 for DISPO.

**Lead sources** — ACQ: Call, DM, PPL, PPC, Listed, SEO, Inbound Seller, SMS (8 sources). DISPO: SEO, Listed, PPL, DM, Inbound Buyer, Investor Lift, Realtor.com, Redfin, PPC, PropStream, SMS, Call, MLS, Facebook, Zillow (15 sources). Each funnel uses its own source set — the SourcePicker derives from filtered events so it shows the correct set automatically.

### kpi_pipeline_config
- `ghl_kpi_label` — exact raw text GHL sends (e.g. "Appointment Set")
- `kpi_name` — our normalised snake_case version
- `kpi_type` — ACQ / DISPO / Owned & Rentals / additional
- `rep_field` — which column to use for rep attribution: `acq_manager` | `acq_lead_manager` | `dispo_manager` | `dispo_lead_manager` | `agent_name` | `ghl_user_name`

### Data flow
```
GHL webhook → POST /api/kpi/ingest
  → resolve company via location_id → companies.ghl_sub_account_id
  → read KPI + TYPE from payload, normalise to snake_case kpi_name
  → look up kpi_pipeline_config for rep_field to use
  → resolve user_id via users.full_name match (scoped to company)
  → insert into kpi_events (idempotent on external_id)
```

---

## Step 7 — Call Source Page ✅
**Files:**
- `apps/web/app/kpi-dashboard/calls/calls-client.tsx`
- `apps/web/app/kpi-dashboard/calls/page.tsx`
- `supabase/migrations/055_kpi_dashboard.sql` (section 4 — `call_logs` table)
**Status:** Complete. TypeScript clean (0 new errors).

### Sections
1. **Header** — "Call Source" title + DateRangePicker
2. **Stat cards (4)** — Total Leads, Appts Set, Closed Deals, Calls Dialed (from session logs)
3. **Agent / Type toggle table** — "Agent" tab: agent name + record count; "Type" tab: lead type (Lead/Realtor/Wholesaler/Cash Buyer) + count
4. **Call CRM KPIs table** — KPI Name | Count | Leads/KPI (= total leads ÷ KPI count)
5. **Cold Calling KPIs table** — sortable: Agent | Log Date | Total Calls | Manual Calls | Talk Time | Leads Submitted
6. **Mockup notice** at bottom

### Key details
- Filtered to `kpi_type === 'ACQ'` AND `lead_source === 'Call'` — not a call log page
- `contact_type` field added to `DummyKpiEvent` (Lead / Realtor / Wholesaler / Cash Buyer, ~58/22/12/8% split)
- Caller sessions use `CallerSession` type, seeded `lcg(77)` — maps to `caller_sessions` table in Milestone 2
- Leads/KPI formula: total `lead` KPI events ÷ count of that KPI (e.g. 25 leads ÷ 10 appt_set = 2.5)
- Lead row shows `—` for Leads/KPI (it's the numerator)

---

## Step 6 — Leaderboard ✅
**File:** `apps/web/app/kpi-dashboard/leaderboard/leaderboard-client.tsx`
**Status:** Complete. TypeScript clean.

### Sections
1. **Header** — title + All/ACQ/DISPO type toggle + SourcePicker + DateRangePicker
2. **Summary cards (5)** — Total Leads, Meetings, Offers, Closed Deals, Potential Profit (team totals for current filter)
3. **Sortable leaderboard table** — click any column header to sort asc/desc; active column highlighted; defaults to Closed desc
4. **Empty state** — message shown when no data matches filters

### Table columns
Rank · Rep (with ACQ/DISPO type badge) · Leads · Meetings · Offers · Contracts · Closed · Lead to Close % · Potential Profit

### Key details
- Top 3 ranks get gold/silver/bronze circle badges
- Meetings normalised: `appointment_set` for ACQ reps, `showing_set` for DISPO reps
- All three filters (type, source, date) applied simultaneously to every section
- `SourcePicker` reused from `../source-picker.tsx`
- Row hover highlight; zero-profit and zero-conv shown as muted `0%` / `$0`

---

## Step 5 — DISPO Funnel Page ✅
**File:** `apps/web/app/kpi-dashboard/dispo/dispo-funnel-client.tsx`
**Status:** Complete. TypeScript clean.

### Sections
1. **Header** — "DISPO Funnel" title + SourcePicker + DateRangePicker (yellow accent)
2. **Rep filter pills** — All Reps + Lisa Park, Tom Wilson
3. **Stat cards (4)** — Total Leads, Showings Set, Contracts Signed, Closed Deals
4. **Pipeline Funnel** — 10 main stages with yellow bars; drop-off sub-rows:
   - Under Showing Set: No Show, Showing Cancelled
   - Under Offer Received: Offer Rejected
   - Under Contract Sent/Received: Contract Rejected
   - Under Contract Signed: Owned & Rentals variant
   - Under Closed Deal: Cancelled Deal, Closed (Owned & Rentals)
5. **Key Conversion Ratios** — 6-card grid: Lead to Showing Set, Showing Set to Held, Held to Offer, Offer to Contract Signed, Signed to Closed, Lead to Closed
6. **Full Conversion Matrix** — 77-ratio triangular matrix (12×12), CSV-exact; same color scale and sticky label column as ACQ
7. **Rep Breakdown table** — 8 cols: Rep, Leads, Interested, Showings Set, Showings Held, Offers, Closed, Lead to Close
8. **Mockup notice** at bottom

### Key details
- 77 DISPO conversion ratios across 12 FROM rows × 12 TO columns (CSV-exact)
- Contact-intersection ratio computation (same logic as ACQ)
- `SourcePicker` shared component for lead source filter
- Yellow theme throughout (`C.yellow` bars, active states)

---

## Step 4 — ACQ Funnel Page ✅
**File:** `apps/web/app/kpi-dashboard/acq/acq-funnel-client.tsx`
**Status:** Complete. TypeScript clean.

### Sections
1. **Header** — "ACQ Funnel" title + DateRangePicker (default: Last 30 Days)
2. **Rep filter pills** — All Reps + 5 individual reps (James Carter, Sarah Mitchell, Mike Reynolds, Alex Torres, Emma Davis)
3. **Stat cards (4)** — Total Leads, Appts Set, Contracts Signed, Closed Deals (each with % of leads)
4. **Pipeline Funnel** — 8 main stages with horizontal bars; drop-off sub-rows indented under their parent stage:
   - Under Appointment Set: Live Transfer ✓, Live Transfer ✗
   - Under Appointment Held: No Show, Appt Cancelled
   - Under Offer Made: Offer Rejected
   - Under Contract Sent: Contract Rejected
   - Under Closed Deal: Cancelled Deal
5. **Key Conversion Ratios** — 6-card grid: Lead to Appt Set, Appt Set to Held, Held to Offer, Offer to Contract, Sent to Signed, Signed to Closed
6. **Full Conversion Matrix** — 56-ratio triangular matrix (10 FROM rows × 12 TO columns), CSV-exact valid cells only; color-coded by conversion quality; sticky row label column
7. **Rep Breakdown table** — 8 cols: Rep, Leads, Appts Set, Appts Held, Offers, Contracts, Closed, Lead to Close
8. **Mockup notice** at bottom

### Key implementation details
- Contact-intersection ratio computation: `Set<contact_id>` intersection, not raw count division — avoids wrong ratios for cross-branch paths
- `ratioColor()` scale: ≥80% green, ≥60% light green, ≥40% yellow, ≥20% amber, >0% red
- 56 CSV-exact ratios defined in `MATRIX_ROWS` with per-row `valid: Set<string>` of valid TO columns
- All AI-looking symbols removed: `→`, `↪`, `↓`, em dashes `—` in labels replaced with plain text
- **Lead Source filter** added post-Step 4: `SourcePicker` shared component (`app/kpi-dashboard/source-picker.tsx`) — custom button+popover matching app design system (same style as DateField in DateRangePicker)

---

## Step 3 — Dummy Data + Overview Page ✅
**Status:** Complete. TypeScript clean.

### Files created
| File | Purpose |
|------|---------|
| `apps/web/app/kpi-dashboard/dummy-data.ts` | 160 ACQ contacts + 60 DISPO contacts, ~450 events total, seeded LCG PRNG (deterministic), remove in Milestone 2 |
| `apps/web/app/kpi-dashboard/overview-client.tsx` | Client component: 4 stat cards, ACQ/DISPO funnel panels, rep performance table, DateRangePicker + type filter |
| `apps/web/app/kpi-dashboard/page.tsx` | Replaced stub — imports OverviewClient |

### Dummy data specs
- **ACQ:** 100 contacts × 5 reps (James Carter, Sarah Mitchell, Mike Reynolds, Alex Torres, Emma Davis), funnel conversion rates: Lead→ApptSet 38%, ApptSet→ApptHeld 65%, Held→Offer 60%, Offer→ContractSigned ~48%, Signed→Close 85%
- **DISPO:** 60 contacts × 2 reps (Lisa Park, Tom Wilson), Lead→Interested 55%, Interested→ShowingSet ~58%, Set→Held 65%, Held→OfferReceived 72%, Offer→ContractSigned ~56%, Signed→Close 85%
- All dates within last 28 days, seeded with `lcg(42)` for deterministic output
- **Removal:** swap `DUMMY_EVENTS` import for a Supabase query, delete `dummy-data.ts`

### Overview page sections
1. **Header** — title + ACQ/DISPO/All toggle + DateRangePicker (default: Last 30 Days)
2. **Stat cards** — Total Leads, Meetings Scheduled (appts + showings), Closed Deals (with profit total), Lead→Close Rate
3. **Funnel panels** — ACQ (blue bars) and DISPO (yellow bars) side-by-side; each shows 7 key stages with unique-contact counts and "% of prev stage" conversion
4. **Rep table** — sorted by closed deals: Rep | Type | Leads | Meetings | Offers | Closed | Conv %
5. **Mockup notice** — yellow badge at bottom noting dummy data

---

## Step 2 — App Scaffold ✅
**Status:** Complete. TypeScript clean (only pre-existing errors remain).

### Files created
| File | Purpose |
|------|---------|
| `apps/web/app/kpi-dashboard/layout.tsx` | Auth + PlatformSidebar wired, fetches `app_kpi_dashboard` |
| `apps/web/app/kpi-dashboard/page.tsx` | Overview stub |
| `apps/web/app/kpi-dashboard/loading.tsx` | Loading skeleton |
| `apps/web/app/kpi-dashboard/acq/page.tsx` | ACQ Funnel stub |
| `apps/web/app/kpi-dashboard/dispo/page.tsx` | DISPO Funnel stub |
| `apps/web/app/kpi-dashboard/leaderboard/page.tsx` | Leaderboard stub |
| `apps/web/components/kpi-dashboard/layout/ContentShell.tsx` | Simple content wrapper (marginLeft: 248) |

### Files modified
| File | Change |
|------|--------|
| `components/platform/app-data.ts` | Added `kpiDashboard` to `Access` interface; added KPI Dashboard entry to `APP_REGISTRY` with 4 subNav items (Overview, ACQ Funnel, DISPO Funnel, Leaderboard); imported `TrendingUp` icon |
| `middleware.ts` | Added `/api/kpi/ingest` to `PUBLIC_PATHS`; added `{ prefix: '/kpi-dashboard', flag: 'app_kpi_dashboard' }` to `APP_GATE`; added `app_kpi_dashboard` to select + flagMap |
| 9 app layouts | Added `app_kpi_dashboard` to select query + `kpiDashboard` to access object |
| 8 platform pages | Added `app_kpi_dashboard` to select query + `kpiDashboard` to inline access objects |

### APP_REGISTRY entry
```ts
{
  id: 'kpi-dashboard', label: 'KPI Dashboard',
  href: '/kpi-dashboard', icon: TrendingUp, accessKey: 'kpiDashboard', accentRgb: '252,175,23',
  subNav: [
    { href: '/kpi-dashboard',             label: 'Overview',     icon: LayoutDashboard, exact: true },
    { href: '/kpi-dashboard/acq',         label: 'ACQ Funnel',   icon: BarChart3 },
    { href: '/kpi-dashboard/dispo',       label: 'DISPO Funnel', icon: BarChart2 },
    { href: '/kpi-dashboard/leaderboard', label: 'Leaderboard',  icon: Trophy },
  ],
}
```

---

## Step 7b — SMS Source Page ✅
**Files:** `apps/web/app/kpi-dashboard/sms/sms-client.tsx` + `page.tsx`
**Status:** Complete.

- First table: lead source = SMS, record count (single view, no tabs)
- Source KPIs: `no_show` only
- Other tables same as Call page (KPI table, Leads/KPI ratio, SMS sessions)
- Icon: `MessageSquare`

---

## Step 7c — PPC Source Page ✅
**Files:** `apps/web/app/kpi-dashboard/ppc/ppc-client.tsx` + `page.tsx`
**Status:** Complete.

- First table: 3 tabs — Website (MainSite.com / LandingA/B.com / PromoPage.com) | Validity (Valid/Invalid) | Form (Form 1/2)
- PPC metadata seeded with `lcg(99)`, stored in `DUMMY_PPC_META` keyed by `contact_id`
- Source KPIs: `contract_rejected`, `appointment_cancelled`
- Icon: `MousePointerClick`

---

## Step 7d — DM Source Page ✅
**Files:** `apps/web/app/kpi-dashboard/dm/dm-client.tsx` + `page.tsx`
**Status:** Complete.

- First table: Campaign | Record Count (6 campaigns, seeded `lcg(111)`)
- Source KPIs: `lead_assigned`, `closed_deal`, `appointment_held`
- Icon: `Mail`

---

## Step 7e — PPL Source Page ✅
**Files:** `apps/web/app/kpi-dashboard/ppl/ppl-client.tsx` + `page.tsx`
**Status:** Complete.

- First table: 3 tabs — Source (PPL total) | Dispute (Denied/Accepted/New, seeded `lcg(122)`) | Type (contact type)
- Source KPIs: `lead`, `lead_assigned`, `live_transfer_successful`, `live_transfer_unsuccessful`
- Icon: `UserCheck`

---

## Step 7f — SEO Source Page ✅
**Files:** `apps/web/app/kpi-dashboard/seo/seo-client.tsx` + `page.tsx`
**Status:** Complete.

- First table: 3 tabs — Website (5 sites) | Validity (Valid 72%/Non-Valid) | Form (Form 1/2/3)
- Two bar charts: leads by website + leads by form
- SEO metadata seeded `lcg(133)`, stored in `DUMMY_SEO_META`
- Source KPIs: `lead`, `lead_assigned`, `offer_made`
- Icon: `Search`

---

## Step 7g — Listed Source Page ✅
**Files:** `apps/web/app/kpi-dashboard/listed/listed-client.tsx` + `page.tsx`
**Status:** Complete.

- First table: Agent Name | Record Count (no tabs)
- Source KPIs: `lead`, `lead_assigned`, `rejected_offer`
- Icon: `Home`

---

## Step 8 — Source-specific KPI tables (all 7 source pages) ✅
**Status:** Complete.

Each source page has:
1. **Compact "Source KPIs" card** — only that source's relevant KPIs + count, above the main tables
2. **Leads/KPI ratio** — filled only for source-relevant KPIs; `—` for all others

KPI assignments per source:
- Call: `lead`, `cancelled_deal`, `lead_assigned`, `contract_signed`, `appointment_set`
- SMS: `no_show`
- PPC: `contract_rejected`, `appointment_cancelled`
- DM: `lead_assigned`, `closed_deal`, `appointment_held`
- PPL: `lead`, `lead_assigned`, `live_transfer_successful`, `live_transfer_unsuccessful`
- SEO: `lead`, `lead_assigned`, `offer_made`
- Listed: `lead`, `lead_assigned`, `rejected_offer`

Pattern: `SOURCE_KPIS_LIST` array + `SOURCE_KPIS = new Set(SOURCE_KPIS_LIST)` at module level per page.

---

## Step 9 — ACQ Performance & KPI Matrices ✅
**File:** `apps/web/app/kpi-dashboard/acq/acq-funnel-client.tsx`
**Status:** Complete.

Three new sections added to ACQ Funnel page:

1. **Agent Performance Metrics table** — Agent | Talk Time | Total Calls | Unique Leads | SMS Sent | Avg Duration
   - Talk time + calls from `DUMMY_CALLER_SESSIONS` (seeded `lcg(77)`)
   - SMS sent from `DUMMY_SMS_SESSIONS` (seeded `lcg(88)`)
   - Unique leads from filtered `kpi_name === 'lead'` events

2. **ACQ Positive KPIs matrix** — Agent rows × 8 positive KPI columns; green counts when > 0, `—` when 0
   - KPIs: Lead Assigned, Live Trans. ✓, Appt Set, Appt Held, Offer Made, Contract Sent, Signed, Closed

3. **ACQ Negative KPIs matrix** — Agent rows × 6 negative KPI columns; red counts when > 0
   - KPIs: Live Trans. ✗, No Show, Appt Cancelled, Rej. Offer, Contract Rej., Cancelled

Both matrices have sticky agent name column.

---

## Step 10 — Qualification / Quality feature ✅
**Files:** `dummy-data.ts`, `acq-funnel-client.tsx`, `dispo-funnel-client.tsx`
**Status:** Complete.

### Data model additions (`DummyKpiEvent`)
Three new fields, populated only for `kpi_name === 'lead'`:
- `quality: 'Qualified' | 'Disqualified' | 'Pending' | null` — 35/20/45% split
- `date_created: string | null` — contact created 1–14 days before `occurred_at`
- `stage: string | null` — CRM stage at time of lead

### Stage constants exported from `dummy-data.ts`
- `REGULAR_STAGES` (13): Contacted Follow Up, Perseverant, 30 Day Nurture, 3 Months Nurture, 6 Months Nurture, 12 Months Nurture, Attempted Contact, Dispute Lead, Needs Skip Tracing, Skiptrace Completed, Dead, dnd, ghosted
- `VIP_STAGES` (10): Responded, New Lead, Appointment Set, Offer Made, Offer Rejected, Contract Sent, Contract Signed, Closed Deal, Negotiating, Cancelled Deal
- `DISPO_STAGES` (9): New Potential Buyer, Showing Requested, Offer Received, Interested, Contract Signed, Qualified, Responded, Dead, DND

### ACQ qual tables (4 new sections)
1. **Qualification Status per Lead Source** — source × Qualified/Pending/Disqualified + total
2. **Qualification Status per Stage** — REGULAR_STAGES × qual status
3. **Qualification Status per Stage (VIP)** — VIP_STAGES × qual status
4. **Lead Source per Qualification Date** — grouped by source → agent subrows × qual status

### DISPO qual + KPI tables (5 new sections)
1. **DISPO Positive KPI matrix** — agents × 8 positive KPIs (green)
2. **DISPO Negative KPI matrix** — agents × 5 negative KPIs (red)
3. **Status per Potential Buyer Source** — all DISPO sources × qual status
4. **Qualification Status per Stage** — DISPO_STAGES × qual status
5. **Potential Buyer Source per Qualification Date** — filtered to buyer sources (SEO/Inbound Buyer/PPL/DM/Listed) → agent subrows × qual status

### PRNG seeds used
- `lcg(144)` — ACQ quality/stage
- `lcg(155)` — DISPO quality/stage

---

## Step 11 — Access control & misc ✅
**Status:** Complete.

- **Leaderboard hidden** — nav entry commented out in `app-data.ts`
- **KPI Dashboard restricted to admin/super_admin only** — `minRole: 'admin'` added to the `APP_GATE` entry in `middleware.ts`; `user` role redirected to `/dashboard?no_access=1` regardless of `app_kpi_dashboard` flag
- **DISPO agents expanded** — 7 reps (was 2): Lisa Park, Tom Wilson, Kevin Nguyen, Rachel Foster, Marcus Bell, Diana Ortiz, Jason Tran
- **Migration 055 made fully idempotent** — `DROP POLICY IF EXISTS` added before all 9 `CREATE POLICY` statements

---

## Planned Steps

| Step | Description | Status |
|------|-------------|--------|
| 1 | DB migration (`055_kpi_dashboard.sql`) | ✅ Written |
| 2 | App scaffold (route group, layout, middleware, sidebar entry, `app-data.ts`) | ✅ Done |
| 3 | Dummy data + Overview page | ✅ Done |
| 4 | ACQ Funnel page | ✅ Done |
| 5 | DISPO Funnel page | ✅ Done |
| 6 | Leaderboard (hidden for now) | ✅ Done |
| 7 | All 7 source pages (Call/SMS/PPC/DM/PPL/SEO/Listed) | ✅ Done |
| 8 | Source-specific KPI tables + Leads/KPI ratio | ✅ Done |
| 9 | ACQ Performance Metrics + Positive/Negative KPI matrices | ✅ Done |
| 10 | Qualification/Quality feature (ACQ + DISPO) | ✅ Done |
| 11 | Access control (admin-only) + DISPO agent expansion | ✅ Done |
| 12 | Ingest route (`POST /api/kpi/ingest`) | Pending |
| 13 | Pipeline Config UI (admin maps GHL labels → kpi_name) | Pending |
| 14 | Milestone 2: swap dummy data for Supabase queries | Pending |
