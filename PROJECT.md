# KPI Driver — Full Project Reference

Complete technical map of the platform: apps, database, APIs, data flows, and how everything connects.

---

## What It Is

KPI Driver is a multi-app SaaS platform for real estate investment companies. It lives at a single Next.js domain and hosts seven independent tools under one auth and billing system. Companies are onboarded by a super admin, users are invited by company admins, and each app is unlocked per user via admin-managed flags.

---

## Repository Structure

```
kpi-driver/
├── apps/
│   └── web/                        # The only deployable app (Next.js 15)
│       ├── app/                    # App Router pages + API routes
│       │   ├── (auth)/             # Login, set-password, invite callback
│       │   ├── (platform)/         # Shared platform shell (dashboard, billing, admin, settings)
│       │   ├── sales-coach/        # AI Sales Coach pages
│       │   ├── training-coach/     # AI Training Coach pages
│       │   ├── underwriting/       # AI Deal Underwriter pages
│       │   ├── skip-tracing/       # AI Skiptracing pages
│       │   ├── note-taker/         # AI Note Taker pages
│       │   ├── data-enrichment/    # AI Data Enrichment pages
│       │   ├── kpi-dashboard/      # KPI Dashboard pages
│       │   └── api/                # All API route handlers
│       ├── components/             # Shared + per-app UI components
│       ├── lib/                    # Business logic (claude.ts, scorer.ts, calculations.ts, etc.)
│       └── middleware.ts           # Auth + app-access gating
├── packages/
│   ├── auth/                       # Supabase SSR client wrappers
│   ├── stripe/                     # Stripe plans, payments, webhook handlers
│   └── tsconfig/                   # Shared TypeScript configs
└── supabase/
    └── migrations/                 # 055 SQL migration files
```

**Stack:** pnpm + Turborepo. Single deployable app on Vercel. No test runner configured.

---

## The Seven Apps

| App | Route | Access Key | What It Does |
|-----|-------|-----------|-------------|
| AI Sales Coach | `/sales-coach` | `app_sales_coach` | Scores live GHL sales calls via Claude |
| AI Training Coach | `/training-coach` | `app_training_coach` | Scores AI role-play practice calls from Assistable |
| AI Deal Underwriter | `/underwriting` | `app_underwriting` | Full property underwriting pipeline (comps, ARV, max offer, report) |
| AI Skiptracing | `/skip-tracing` | `app_skip_tracing` | Tracerfy-powered skiptracing, DNC scrub, APN lookup |
| AI Note Taker | `/note-taker` | `app_note_taker` | Call transcription + AI-generated notes and CRM field fills |
| AI Data Enrichment | `/data-enrichment` | `app_data_enrichment` | Property lead enrichment with ownership and market data |
| KPI Dashboard | `/kpi-dashboard` | `app_kpi_dashboard` | ACQ + DISPO funnel metrics and source-level KPI tracking |

Two additional entries in the app registry are external links (not hosted here):
- **AI Agent** → `/ai-agents` (external)
- **Knowledge Base** → `/knowledge-base` (external)

---

## Auth & Access Control

### Authentication
Supabase Auth handles sessions. `@kpidriver/auth/middleware` refreshes the JWT on every request. All unauthenticated requests redirect to `/login?next=<path>`.

### Three Roles
Stored in `users.access_role` (Postgres enum):

| Role | Scope |
|------|-------|
| `super_admin` | All companies, all data — bypasses all app flags |
| `admin` | Own company only — bypasses app flags, accesses billing/user management |
| `user` | Own data only — requires explicit app flag to access each app |

### App Access Flags
Stored as booleans on the `users` table:
`app_underwriting`, `app_sales_coach`, `app_training_coach`, `app_note_taker`, `app_data_enrichment`, `app_skip_tracing`, `app_kpi_dashboard`

Set by admins at `/admin/users` (invite or edit flow). New users default to all `false`. Admins and super_admins always have access regardless of flags.

**Exception:** `kpi-dashboard` requires `minRole: 'admin'` — even if the flag is `true`, `user` role is blocked.

### Middleware Logic (`apps/web/middleware.ts`)
```
1. PUBLIC_PATHS skip all checks (webhook routes, auth routes, Stripe webhook)
2. updateSession() refreshes Supabase session
3. No session → redirect /login
4. Path matches APP_GATE prefix → check:
   a. super_admin → always pass
   b. minRole: 'admin' → require admin or super_admin
   c. Otherwise → require flag = true (admin redirects to /auth/unlock-app, user to /dashboard?no_access=1)
```

### Webhook Auth (separate from session)
All ingest routes (`/api/calls/ingest`, `/api/training-coach/ingest`, etc.) are in `PUBLIC_PATHS` — they bypass Supabase session entirely. Instead they use `x-webhook-secret` header verified with `crypto.timingSafeEqual` against the `WEBHOOK_SECRET` env var.

---

## Database

Supabase Postgres. All tables have Row Level Security enabled. Three helper RPCs (`get_my_access_role()`, `get_my_company_id()`) are SECURITY DEFINER functions used in RLS policies.

Three Supabase clients:
- `lib/supabase/server.ts` — RSC / server components (cookie session)
- `lib/supabase/client.ts` — browser client
- `lib/supabase/admin.ts` — service-role client (bypasses RLS) — used in webhook/ingest routes and admin server actions

### Core Tables

#### `companies`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | |
| ghl_sub_account_id | text | matched by all ingest webhooks |
| wallet_balance | numeric(12,2) | company dollar balance for AI usage |
| stripe_customer_id | text | Stripe customer for top-ups |
| credits_balance | integer | legacy integer credits (superseded by wallet_balance) |
| logo_url | text | |
| timezone | text | company timezone for digest scheduling |
| created_at | timestamptz | |

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | references auth.users |
| full_name | text | used for ingest name matching (ilike) |
| email | text | |
| phone | text | UNIQUE |
| access_role | enum | super_admin / admin / user |
| agent_type | enum | fus / acq / tc / cc / none — determines scoring rubric |
| company_id | uuid FK → companies | |
| is_active | boolean | inactive users rejected at ingest |
| app_underwriting | boolean | |
| app_sales_coach | boolean | |
| app_training_coach | boolean | |
| app_note_taker | boolean | |
| app_data_enrichment | boolean | |
| app_skip_tracing | boolean | |
| app_kpi_dashboard | boolean | |
| avatar_url | text | |
| terms_consent_at | timestamptz | |
| created_at | timestamptz | |

Auto-created by `handle_new_user()` trigger on `auth.users` insert.

#### `live_calls`
Scored calls from GHL/n8n via Sales Coach ingest.
| Column | Notes |
|--------|-------|
| user_id, company_id | |
| direction | inbound / outbound |
| duration_sec | |
| call_stage | CRM stage at time of call |
| scorable | false if agent_type has no rubric |
| score | 0–100 integer (null if not scorable) |
| call_result | 2-3 word outcome from Claude |
| transcript | full transcript text |
| recording_url, crm_link | back-links to GHL |
| evaluation | JSONB — full Claude output (rubric version, category scores, penalties, bonuses, coaching actions, evidence snippets, confidence, manager_review_needed) |

#### `training_calls`
Same schema as `live_calls` plus `ai_name` (the AI agent persona name). Written by Training Coach ingest.

#### `training_ai_agents`
AI bot personas for Assistable role-play.
| Column | Notes |
|--------|-------|
| company_id | null = global persona visible to all companies |
| name, description | |
| phone_number | UNIQUE — the Assistable-assigned telecom number |
| external_agent_id | Assistable's own agent ID (reference only) |

Only `super_admin` can create/edit global agents (null company_id). Company admins manage their own.

#### `user_phones`
Multiple phone numbers per user for Training Coach matching.
| Column | Notes |
|--------|-------|
| user_id FK → users | |
| phone | UNIQUE across all users |

#### `deals`
One row per underwriting submission.
| Column | Notes |
|--------|-------|
| user_id | the user who ran the analysis |
| address | |
| status | pending / completed / failed |
| recommendation | pursue / negotiate / pass |
| arv_low, arv_high, max_offer | top-level financials for list view |
| company_id | added later via migration |

#### `underwriting_reports`
Full output of the underwriting pipeline. One per deal.
| Column | Notes |
|--------|-------|
| deal_id FK → deals | |
| All financials | beds/baths/sqft, ARV low/high, repair costs, max offer low/high, net sales price |
| property_data | JSONB — full Axesso/Zillow property record |
| comps | JSONB — all comps with categories and Claude reasoning |
| calculations | JSONB — full offer stack breakdown |
| ai_assessment | JSONB — condition score, category breakdown, comp validation, ARV synthesis |
| flags | text[] — pipeline flags (sqft_range_expanded, tenant_occupied, etc.) |
| recommendation, confidence, summary | from final Claude report call |

#### `skip_tracing_logs`
One row per skiptrace, DNC, or APN lookup.
| Column | Notes |
|--------|-------|
| company_id | |
| flow_type | apn / dnc / skiptrace |
| address, parcel_id, national_dnc | type-specific fields |
| lead_source, crm_link | |
| payload | JSONB — full provider response |

#### `note_taker_logs`
One row per ingested note-taker call.
| Column | Notes |
|--------|-------|
| company_id, user_id | |
| contact_name, contact_phone | |
| agent_name | |
| lead_source, crm_link | |
| transcript | |
| summary, custom_fields | JSONB — AI-generated output |

#### `data_enrichment_logs`
One row per enrichment request from n8n.
| Column | Notes |
|--------|-------|
| company_id | |
| contact_name, contact_phone | |
| address | |
| payload | JSONB — full enrichment data |

#### `kpi_events`
Raw KPI event records from GHL (ACQ/DISPO pipeline milestones).
| Column | Notes |
|--------|-------|
| company_id | |
| kpi_name | lead, call, sms, appointment_set, offer_made, contract_signed, closed_deal, etc. |
| kpi_type | ACQ / DISPO |
| user_id, user_name | the rep who generated the event |
| lead_source | Facebook Ads, Google, etc. |
| occurred_at | when the KPI event happened |
| profit | numeric (for closed deals) |

#### `kpi_pipeline_config`
Admin-managed mapping of GHL pipeline labels → `kpi_name` values.

#### `call_logs`
Caller session logs for the KPI dashboard call analytics.

#### `ai_usage_logs`
One row per completed AI workflow (one deal, one call score, one training call).
| Column | Notes |
|--------|-------|
| company_id, app | sales_coach / training_coach / underwriting / note_taker / data_enrichment |
| entity_id, entity_type | live_call / training_call / deal / etc. |
| input_tokens, output_tokens, cost_usd, model | |
| cost_breakdown | JSONB — per-provider breakdown |

#### `company_wallet_transactions`
Ledger of all wallet top-ups and AI deductions.
| Column | Notes |
|--------|-------|
| company_id | |
| type | topup / deduction |
| amount_usd | |
| app | which app caused the deduction |
| stripe_payment_intent_id | UNIQUE — idempotency for Stripe top-ups |
| description | |

#### `billing_config`
Per-app and optionally per-company pricing configuration.
| Column | Notes |
|--------|-------|
| app | underwriting / sales_coach / training_coach / note_taker / data_enrichment / skip_tracing |
| company_id | null = global default |
| multiplier | legacy markup multiplier (e.g. 1.3 = 30% markup) |
| claude_input_charged_per_m | what the company is charged per 1M input tokens |
| claude_output_charged_per_m | what the company is charged per 1M output tokens |
| credit_cost_usd | cost per credit unit (for skip tracing) |

Per-company rows override global rows. Updated by super admin at `/super-admin/billing-config`.

#### Supporting tables
- `daily_digests` — digest send history per user + period
- `credit_transactions` — legacy integer credit ledger

---

## API Routes

### Webhook Ingest Routes (all bypass session auth, use `x-webhook-secret`)

| Route | Triggered by | What it does |
|-------|-------------|-------------|
| `POST /api/calls/ingest` | n8n (from GHL after call) | Matches company + rep by name, scores call with Claude, saves to live_calls, deducts wallet |
| `POST /api/training-coach/ingest` | Assistable AI (direct webhook) | Matches company by location_id, rep by phone (user_phones table), scores call, saves to training_calls |
| `POST /api/note-taker/ingest` | n8n | Matches company, generates AI notes/summary, saves to note_taker_logs |
| `POST /api/data-enrichment/ingest` | n8n | Matches company, saves enrichment payload |
| `POST /api/skip-tracing/ingest` | n8n (from Tracerfy) | Matches company, detects flow type, deducts credits, saves to skip_tracing_logs |
| `POST /api/kpi/ingest` | n8n (from GHL pipeline) | Not yet implemented (placeholder in PUBLIC_PATHS) |

### AI / Product Routes

| Route | What it does |
|-------|-------------|
| `POST /api/underwrite` | Full 15-step underwriting pipeline — Axesso + RentCast + 4 Claude calls + save |
| `GET /api/deals/[id]/pdf` | Renders deal report as PDF via @react-pdf/renderer |
| `GET /api/recordings/proxy` | Proxies GHL recording URLs (avoids CORS on the browser) |
| `GET /api/places/autocomplete` | Google Places address autocomplete for the underwriting form |

### Stripe Routes

| Route | What it does |
|-------|-------------|
| `POST /api/stripe/topup` | Smart top-up: charges saved card directly if available, falls back to Checkout |
| `POST /api/stripe/webhook` | Handles checkout.session.completed + payment_intent.succeeded → credits wallet |
| `POST /api/stripe/setup-intent` | Creates a SetupIntent for saving a new card |
| `GET /api/stripe/payment-methods` | Lists saved payment methods for the company |
| `POST /api/stripe/payment-methods/default` | Sets default payment method |
| `DELETE /api/stripe/payment-methods/remove` | Removes a saved card |
| `POST /api/stripe/checkout` | Creates a Checkout session (fallback for top-up) |
| `POST /api/stripe/portal` | Stripe Customer Portal link |
| `POST /api/billing/auto-topup` | Called internally after wallet deduction if balance is low |

### Export Routes (all require session auth)

| Route | What it exports |
|-------|----------------|
| `GET /api/sales-coach/live-calls/export` | CSV of live calls |
| `GET /api/training-coach/export` | CSV of training calls |
| `GET /api/skip-tracing/export` | CSV of skiptrace logs |
| `GET /api/data-enrichment/export` | CSV of enrichment logs |
| `GET /api/note-taker/export` | CSV of note taker logs |

### Email / Cron

| Route | What it does |
|-------|-------------|
| `GET /api/email-reports/cron` | Sends scheduled performance digest emails (triggered by Vercel Cron) |
| `POST /api/email-reports/test` | Test endpoint for previewing digest emails |

---

## External APIs & Integrations

### Anthropic (Claude)

| Use | Key | Model | Calls |
|-----|-----|-------|-------|
| Deal Underwriter | `ANTHROPIC_API_KEY_DEAL_UNDERWRITER` | `claude-opus-4-7` (vision) | 4 per deal |
| Sales Coach | `ANTHROPIC_API_KEY_SALES_COACH` | `claude-sonnet-4-6` | 1 per scored call |
| Training Coach | `ANTHROPIC_API_KEY_SALES_COACH` (shared) | `claude-sonnet-4-6` | 1 per scored call |
| Note Taker | Own key (TBD) | Claude model | 1 per call |

**Deal Underwriter calls (in order):**
1. `assessPropertyCondition` — vision call with listing photos, returns condition score + line items
2. `validateAndCategorizeComps` — categorizes comps as arv / turnkey / as_is, rejects outliers
3. `synthesizeARV` — reconciles RentCast AVM vs. validated ARV comps, returns ARV + range + reasoning
4. `generateUnderwritingReport` — produces full investment memo (executive summary, red/green flags, recommendation, confidence 1–10)

**Sales/Training Coach call:**
- Single call per scored transcript
- System prompt cached (Anthropic ephemeral) — reduces repeated token cost at volume
- Returns: score (0–100), score_band, category_scores, penalties, bonuses, strengths, missed_opportunities, coaching_actions (3: behavioral/tactical/strategic), evidence_snippets, confidence, manager_review_needed

### RentCast
- **Endpoint:** `GET /v1/avm/value?address=...&compCount=5`
- **Used by:** Deal Underwriter (Step 2)
- **Returns:** AVM estimate with low/high range + up to 5 comparable properties with correlation scores
- **Key:** `RENTCAST_API_KEY`

### Axesso (Zillow data)
- **Used by:** Deal Underwriter (Steps 1, 3, 4)
- `searchProperty` — full property details (beds/baths/sqft/year built/lot/features/price history/foreclosure flags/Zestimate/photos)
- `fetchPhotosByAddress` — listing photo URLs
- Used only for subject property data + photo pull + manual comp address resolution (not for comps — RentCast owns comps)
- **Key:** `AXESSO_API_KEY`

### Google Places
- **Endpoint:** Places Autocomplete API
- **Used by:** Underwriting deal submission form (address typeahead)
- **Key:** `GOOGLE_PLACES_API_KEY`

### Stripe
- Per-company Stripe customers (not per-user)
- Top-up products with pre-created price IDs in `packages/stripe/src/topup.ts`
- Payment methods saved to the company customer
- One-click top-up: charges saved default card directly (off-session); falls back to Checkout if no card or 3DS required
- Webhook handles `checkout.session.completed` and `payment_intent.succeeded` for idempotent wallet crediting
- **Key:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Resend (transactional email)
- Configured as custom SMTP in Supabase (bypasses 3/hr free-tier cap)
- Used for: invite emails, set-password emails, digest/report emails
- Invite flow: Supabase sends `token_hash` OTP → `/auth/confirm` verifies server-side → `/auth/set-password`

### GHL (GoHighLevel) + n8n
- GHL is the CRM all clients use
- n8n acts as the middleware/router between GHL and this platform
- After a call is recorded in GHL, n8n transcribes and POSTs to `/api/calls/ingest`
- n8n also routes skiptrace results, enrichment data, and note taker results
- Company matching: `companies.ghl_sub_account_id = location_id` from the webhook payload
- Rep matching (Sales Coach): `ilike(users.full_name, agent_name)` scoped to company

### Assistable AI
- AI voice agent platform for training/role-play calls
- Fires its own post-call webhook directly to `/api/training-coach/ingest` (no n8n in the middle)
- Rep matched by `user_phones.phone = from` (the rep's phone number)
- AI agent matched by `training_ai_agents.phone_number = to` (the bot's assigned number)

---

## Billing Flow

```
Company has a wallet (USD balance in companies.wallet_balance)

Every AI usage deducts from the wallet:
  deduction = tokens_used × charged_rate_per_million
  charged_rate = billing_config row (company-specific or global default)

wallet deduction → company_wallet_transactions row → ai_usage_logs row

If wallet drops below threshold → auto-topup via saved Stripe payment method

Top-up (manual or auto):
  Direct charge if default PM saved → add_wallet_balance() RPC (idempotent on payment_intent_id)
  Stripe Checkout fallback → webhook → add_wallet_balance()
```

**Per-app cost tracking:** Every ingest/underwrite route logs usage to `ai_usage_logs` after scoring. Super admin can view per-company usage breakdowns at `/super-admin/billing-config`. Company admins see their own usage at `/billing` → Usage tab.

---

## Data Flow Diagrams

### Sales Coach (Live Call)
```
GHL call recorded
    → n8n transcribes + routes
    → POST /api/calls/ingest (x-webhook-secret)
        → verify secret
        → match company (ghl_sub_account_id)
        → match rep (ilike full_name)
        → wallet balance check
        → scoreCall() → Claude Sonnet
        → INSERT live_calls
        → logUsage() → ai_usage_logs
        → deduct_wallet_balance()
        → autoTopupIfNeeded()
    → return { call_id, score, score_band, manager_review_needed }
```

### Training Coach
```
Rep dials Assistable bot number
    → Assistable records + transcribes
    → POST /api/training-coach/ingest (x-webhook-secret)
        → verify secret
        → match company (ghl_sub_account_id)
        → match rep (user_phones.phone = from)
        → match AI agent (training_ai_agents.phone_number = to) — best effort
        → scoreCall() → Claude Sonnet (same rubric as live calls)
        → INSERT training_calls
        → logUsage() → deduct wallet
```

### Deal Underwriter
```
User submits address + parameters
    → POST /api/underwrite
        → wallet balance check
        → Axesso: pull property data + photos (Step 1)
        → RentCast: pull AVM + comps (Step 2)
        → resolve manual comps via Axesso searchProperty (Step 4)
        → Claude (vision): assessPropertyCondition (Step 5)
        → calcRepairCosts() — deterministic math (Step 6)
        → Claude: validateAndCategorizeComps (Step 7)
        → Claude: synthesizeARV (Step 8)
        → calcMaxOffer() — deterministic math (Step 9)
        → Claude: generateUnderwritingReport (Step 10)
        → INSERT deals + underwriting_reports
        → logUsage() → deduct wallet
    → return report
```

### Skip Tracing
```
n8n calls Tracerfy API → routes result
    → POST /api/skip-tracing/ingest (x-webhook-secret)
        → match company
        → detect flow_type (apn/dnc/skiptrace from payload shape)
        → deduct credits × credit_cost_usd × multiplier
        → INSERT skip_tracing_logs
```

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Anthropic (one key per product — billed/logged separately)
ANTHROPIC_API_KEY_DEAL_UNDERWRITER
ANTHROPIC_API_KEY_SALES_COACH

# Property data
RENTCAST_API_KEY
AXESSO_API_KEY

# Maps
GOOGLE_PLACES_API_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Webhook auth (shared across all ingest routes)
WEBHOOK_SECRET

# App URL
NEXT_PUBLIC_APP_URL
```

---

## User Management Flow

### Inviting a User
1. Admin goes to `/admin/users` → Invite User
2. Fills in: email, full name, role, agent_type, app flags, (optionally company if super_admin)
3. Server action calls `supabase.auth.admin.inviteUserByEmail()` with metadata
4. Supabase sends invite email via Resend (custom SMTP)
5. User clicks link → `/auth/confirm?token_hash=...&type=invite` → OTP verified server-side → redirect `/auth/set-password`
6. User sets password → session created → lands on platform

### Role and App Flag Edits
Admin edits a user at `/admin/users` → updates `users.access_role`, `users.agent_type`, and all `app_*` flags in one server action call. Changes take effect on the user's next request (middleware re-checks on every gated route).

---

## Platform Pages

### `/(platform)/dashboard`
Landing page after login. Shows stat cards (calls scored this month, deals underwritten, training sessions) + wallet balance (admins only) + the app registry grid with lock/unlock state per app.

### `/(platform)/billing`
Two tabs:
- **Wallet** — current balance, add funds (one-click or Checkout), saved payment methods
- **Usage** — `ai_usage_logs` table filtered by app/period, with click-through to individual deals or calls

### `/(platform)/admin/users`
Company user list. Invite, edit (role/agent_type/flags), deactivate. Admin-only.

### `/(platform)/settings/account`
Edit full name + phone. Change password.

### `/(platform)/settings/company`
Edit company name + GHL sub-account ID. Admin-only.

### `/(platform)/super-admin/companies`
List all companies, create/edit company (name, GHL ID, Stripe customer ID). Super admin only.

### `/(platform)/super-admin/billing-config`
Edit per-app AI charged rates (input/output per million tokens) and multipliers globally or per company. Super admin only.

---

## Page Architecture Pattern

Every data-heavy page follows the same pattern:

```
app/[tool]/page.tsx           ← Server component
  - Supabase query scoped by role (super_admin=all, admin=own company, user=own)
  - Passes data as props to client component

app/[tool]/[name]-client.tsx  ← 'use client' component
  - All filtering / charting / sorting computed client-side
  - Filter state: date range, direction, duration, role, agent multi-select, etc.
  - No server round-trips for filtering
```

All app layouts (`sales-coach/layout.tsx`, etc.) render the shared `PlatformSidebar` (fixed 248px, Framer Motion accordion for sub-nav) and pass `user` + `accessRole` down to client components.

---

## Key Constants

### Agent Types (users.agent_type)
- `fus` — Follow-Up Specialist (setter) — scored by RUBRIC_FUS
- `acq` — Acquisition Specialist (closer) — scored by RUBRIC_ACQ
- `tc` — Transaction Coordinator — no rubric, calls saved but not scored
- `cc` — Cold Caller — no rubric
- `none` — unassigned — not scored

### Score Bands (Sales + Training Coach)
- `Elite` — 90–100
- `Strong` — 75–89
- `Workable` — 60–74
- `Weak` — 45–59
- `Needs Coaching` — 0–44

### Max Offer Formula (Deal Underwriter)
```
Net Sales Price  = ARV × 0.92
Investor Profit  = Net Sales Price × investorProfitPct (default 15%)
Max Offer Low    = Net Sales Price − Repairs High − Investor Profit − Assignment Fee ($22,500 default)
Max Offer High   = Net Sales Price − Repairs Low  − Investor Profit − Assignment Fee
```

### Repair Rates per Sqft (Deal Underwriter)
| Condition | Low | High |
|-----------|-----|------|
| Excellent | $0 | $15 |
| Good | $25 | $35 |
| Fair | $40 | $50 |
| Poor | $55 | $65 |

### ARV Feature Adjustments
- Concrete / brick / stone construction: +$17,500
- Private pool: +$30,000
- Garage: +$15,000
- Off-street parking: +$10,000

---

## Migrations (Applied in Order)

| Migration | What it adds |
|-----------|-------------|
| 001 | Stripe subscriptions (legacy) |
| 002 | Core schema: companies, users, live_calls, training_calls, deals, underwriting_reports, RLS |
| 003 | training_ai_agents table |
| 004 | description + external_agent_id on training_ai_agents |
| 005 | Nullable company_id on training_ai_agents (global personas) |
| 006 | Real Assistable phone numbers on global agent personas |
| 007 | app_* boolean columns on users |
| 008 | user_phones table |
| 009 | ai_usage_logs table |
| 010 | Admin RLS on deals + underwriting_reports |
| 011 | wallet_balance + stripe_customer_id on companies; company_wallet_transactions; billing_config; RPCs |
| 012 | note_taker_logs table |
| 013 | data_enrichment_logs table |
| 015 | skip_tracing_logs table; app_skip_tracing on users |
| 016 | Per-company billing_config rows |
| 021 | auto_topup config on companies |
| 023 | company_logo column |
| 027 | app_spend_summary() RPC |
| 033 | New agent_type enum values |
| 039/050 | company timezone |
| 040–049 | Per-app charged price columns on billing_config |
| 051 | notification_prefs on users |
| 053 | Provider rates (Axesso/RentCast costs) |
| 055 | kpi_events, kpi_pipeline_config, call_logs tables + RLS |

Note: No migration tool is wired up — apply manually in Supabase SQL Editor.
