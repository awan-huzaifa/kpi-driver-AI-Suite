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

## Planned Steps

| Step | Description | Status |
|------|-------------|--------|
| 1 | DB migration (`055_kpi_dashboard.sql`) | ✅ Written |
| 2 | App scaffold (route group, layout, middleware, sidebar entry, `app-data.ts`) | ✅ Done |
| 3 | Dummy data + Overview page (summary stat cards, date filter) | ✅ Done |
| 4 | ACQ Funnel page (pyramid: Lead → Closed Deal) | ✅ Done |
| 5 | DISPO Funnel page (pyramid: Lead → Closed Deal) | ✅ Done |
| 6 | Per-rep Leaderboard table (sortable, filterable) | ✅ Done |
| 7 | Call Metrics page (`/kpi-dashboard/calls`) + `call_logs` DB table | ✅ Done |
| 8 | Ingest route (`POST /api/kpi/ingest`) | Pending |
| 9 | Pipeline Config UI (admin maps GHL labels → kpi_name) | Pending |
