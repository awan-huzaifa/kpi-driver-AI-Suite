# AI Real Estate Operations Suite — Landing Page Content

---

## HERO SECTION

**Headline:**
We Built A Complete AI Operations Suite For A Real Estate Investment Company

**Subheadline:**
Six interconnected AI-powered tools — call scoring, deal underwriting, rep training, note taking, lead enrichment, and skip tracing — all integrated directly into their existing GoHighLevel CRM. Zero manual processes replaced by AI that runs 24/7.

**Supporting Line:**
From a blank repository to a fully deployed, multi-tenant SaaS platform with six live AI modules — built and shipped end to end.

**Primary CTA:** See What We Built
**Secondary CTA:** Work With Us

---

## CONTEXT / PROBLEM SECTION

**Section Headline:**
The Client Was Running A High-Volume Acquisition Business On Gut Feel And Spreadsheets

**Background:**
Our client runs a real estate acquisitions operation with multiple reps making and receiving hundreds of calls per week. They were acquiring, wholesaling, and flipping properties across several markets — but despite the volume, they had almost no visibility into what was actually happening on the phone, how deals were being evaluated, or whether their reps were improving.

**The Problems We Were Asked To Solve:**

### Operations Were Invisible
With 50–200 calls a day going unreviewed, management had no way to know what reps were saying, how leads were being handled, or where deals were falling apart on the phone. Coaching happened based on feel, not data.

### Deals Took Too Long To Evaluate
Each deal required a rep or analyst to manually pull comparable sales, estimate repairs, and calculate ARV before making an offer. This took 1–3 hours per deal and introduced human error and inconsistency across the team.

### New Reps Had No Safe Way To Practice
Onboarding meant reps practiced on real leads before they were ready — costing the company deals during the learning curve. There was no structured way to rehearse calls before going live.

### CRM Data Was Always Incomplete
Reps were expected to fill in notes and contact fields after every call, but rarely did. The CRM was full of gaps — missing contact info, no call summaries, no structured notes.

### Skip Tracing And Enrichment Were Manual, Disconnected
Every skip trace had to be run separately, results copy-pasted into spreadsheets, and then manually entered into the CRM. There was no audit trail, no per-record history, and no way to know what had already been looked up.

---

## SOLUTION OVERVIEW

**Section Headline:**
We Designed And Built A Unified AI Platform That Automates Their Entire Operation

**What We Delivered:**
A production-grade, multi-tenant web application with six AI-powered modules, all connected to their GoHighLevel CRM via webhooks, built on a modern cloud stack, with per-company billing, role-based access control, and a complete admin system.

The platform handles everything from live call scoring to deal analysis to rep training — all without any manual trigger from the team. Calls come in, the AI scores them. A deal address is entered, the AI underwrites it. A rep dials an AI bot to practice, the same scoring system grades the training call.

**What Makes It Different From Off-The-Shelf Tools:**
Every module was built specifically for real estate acquisition workflows — the scoring rubrics, the deal underwriting logic, the training personas, the skip tracing result format, the data enrichment fields. Nothing was generic. The entire system reflects how this business actually operates.

---

## MODULE DEEP DIVES

---

### MODULE 1: AI Sales Coach

**Tagline:** Every Call Scored. Every Rep Coached. Automatically.

---

#### Business Problem It Solves

A sales team making 100 calls a day cannot be manually coached on every call. Most businesses review 5–10% of calls at most — meaning 90–95% of conversations go without any feedback, regardless of what happened on them.

The result: reps develop bad habits that go uncorrected for weeks. Managers have no data to back up coaching conversations. High performers and low performers look identical until deals start falling apart.

#### What It Does (Business View)

Every call that goes through GoHighLevel is automatically sent to the AI Sales Coach after it ends. The system scores the call against a custom rubric and returns a detailed report within minutes — no human review required.

The rubric is segmented by rep role:
- **FUS (Setter / Follow-Up Specialist)** — scored on appointment-setting skills, opener quality, rapport building, objection handling, follow-through, and close
- **ACQ (Closer / Acquisition Specialist)** — scored on rapport, seller motivation discovery, price anchoring, objection handling, offer delivery, and close quality

Each call produces:
- An overall score (0–100)
- A category-by-category score breakdown with rationale
- Specific penalties (what went wrong and why)
- Specific bonuses (what was done well)
- Coaching actions — concrete, actionable steps the rep can take on the next call

Management can view every scored call in a searchable, filterable log. A leaderboard shows team rankings in real time. Analytics show score trends over time, average scores by role, call volume by day, and performance distributions.

#### What It Does (Technical View)

**Ingestion Pipeline:**
- GoHighLevel sends a POST webhook to `/api/calls/ingest` after each call ends
- The endpoint is authenticated via a shared `x-webhook-secret` header (not a user session — designed for machine-to-machine calls)
- The route is excluded from Next.js middleware auth checks so webhooks never get blocked
- The payload includes: `location_id` (GHL sub-account ID), `agent_name`, `agent_phone`, `transcript`, call metadata

**Company + Rep Matching:**
- `location_id` is matched to a company via `companies.ghl_sub_account_id`
- The rep is matched by `agent_name` using a case-insensitive ILIKE search scoped to that company
- `agent_phone` is stored for reference but is not used for matching (name matching is more reliable with GHL's data format)
- If no matching company or rep is found, the call is rejected with a 404 before any AI is invoked

**AI Scoring:**
- Scoring is handled by `lib/sales-coach/anthropic/scorer.ts`
- The system calls Anthropic's Claude model with a structured prompt containing the call transcript and the appropriate rubric (selected by `agent_type`)
- The rubric is defined in `lib/sales-coach/anthropic/rubrics.ts` — separate rubric configs for FUS and ACQ roles with distinct category weights and scoring criteria
- The AI returns a structured JSON object: `{ score, evaluation: { categories, penalties, bonuses, coachingActions } }`
- Token usage (input + output) and cost are captured from the API response

**Storage:**
- The scored call is written to `live_calls` table in Supabase Postgres
- `evaluation` is stored as JSONB — fully queryable, indexed
- A separate `ai_usage_logs` entry is written recording tokens used, cost, model, and the entity scored (fire-and-forget, never blocks the response)
- Wallet deduction via `deduct_wallet_balance()` RPC is called after scoring — amount = AI cost × per-app billing multiplier set by the super admin

**Access Control:**
- Role-based data scoping: `user` sees own calls, `admin` sees company calls, `super_admin` sees all companies
- All Supabase queries enforce RLS plus application-level role filtering

**Stack:**
- Next.js 15 App Router API route (server-side, no client involvement in ingestion)
- Supabase Postgres with Row Level Security
- Anthropic Claude (model: configurable, currently Claude 3.5 Sonnet)
- Custom rubric engine in TypeScript

---

### MODULE 2: AI Training Coach

**Tagline:** Train Reps Against AI Before They Touch A Real Lead

---

#### Business Problem It Solves

New reps in real estate acquisitions go through a steep learning curve. The standard approach is to put them on live calls early — which means real motivated seller leads are being handled by reps who don't yet know the script, can't handle objections, and haven't built the muscle memory for the conversation flow.

Every bad call a new rep makes on a live lead is a potential deal lost. The client needed a way for reps to practice in a realistic environment — against an AI that actually pushes back — before touching a real lead.

They also needed a way to run refresher training for existing reps who were dropping in score, without pulling them off the phones for classroom sessions.

#### What It Does (Business View)

The Training Coach works with AI voice bot personas deployed in Assistable AI. The client's team registers each AI bot in the platform with its name, description, and phone number. Reps then call those numbers from their own phones to have a simulated seller conversation.

When the call ends, Assistable sends a webhook to the platform and the training call is scored automatically — using the exact same rubric as live calls. The rep sees their score, category breakdown, and coaching notes just like they would on a real call.

Available AI personas include: Skeptical Homeowner, Burned Seller, Motivated Seller Behind On Payments, Inherited Property Owner, Absentee Landlord, Pre-Foreclosure Seller, and more — each tuned to behave differently and challenge different skills.

Managers see training analytics — per-rep session counts, average training score, score-over-time trend, comparisons between training score and live call score.

#### What It Does (Technical View)

**Ingestion Pipeline:**
- Assistable AI sends a POST webhook directly to `/api/training-coach/ingest` after each training call — no n8n routing, Assistable fires the URL itself
- Same `x-webhook-secret` authentication as the live call route
- The payload differs from the live call payload: Assistable sends `location_id`, `from` (rep's phone number), `to` (AI bot's phone number), `transcript`, and its own `call_id`

**Rep Matching (Two-Step, Gated):**
- `location_id` → company via `companies.ghl_sub_account_id`
- `from` (rep's phone) → `user_phones.phone` table — reps register their numbers themselves at `/training-coach/my-numbers` (one user can have multiple registered numbers)
- A second query verifies: the matched user belongs to the resolved company AND `is_active = true`
- This two-step match is the **scoring gate** — if the rep's phone is unrecognized, the call is rejected before AI is ever called. This prevents unregistered numbers from consuming AI credits.
- `training_calls.user_id` is `NOT NULL` at the DB level — a call without a matched rep cannot be stored even if the gate were bypassed

**AI Agent Matching (Best-Effort):**
- `to` (bot's phone) → `training_ai_agents.phone_number` — identifies which persona was being practiced against
- If the bot number is unrecognized, the call is still scored and saved with `ai_agent_id: null` — it just won't display an agent name in the UI
- Global AI personas (created by super_admin) are visible to all companies; company-specific personas are scoped to their company

**Idempotency:**
- Assistable may retry webhook delivery if the first attempt times out
- The route is idempotent on `external_call_id` (Assistable's `call_id`) — duplicate deliveries are silently ignored at the DB level via unique constraint

**Scoring:**
- Reuses `scoreCall()` from `lib/sales-coach/anthropic/scorer.ts` verbatim — same function, same rubrics, same output shape
- Written to `training_calls` table instead of `live_calls`
- Same `ai_usage_logs` + wallet deduction pattern

**Stack:**
- Supabase: `training_calls`, `training_ai_agents`, `user_phones` tables
- Assistable AI as the voice bot platform
- Shared scoring engine with the Sales Coach

---

### MODULE 3: AI Deal Underwriter

**Tagline:** From Address To Full Investment Report In Minutes

---

#### Business Problem It Solves

Evaluating a deal in real estate means pulling comparable sales, estimating the after-repair value, calculating repair costs, and determining a maximum offer — all before giving the seller any number. For an acquisition-focused team doing volume, this process was taking 1–3 hours per deal, required analyst time, and produced inconsistent results depending on who ran it.

Deals were being passed on because the team couldn't evaluate them fast enough. Offers were being made with incomplete data. Analysts were spending most of their time on research, not judgment.

#### What It Does (Business View)

The rep enters a property address. The platform runs a full underwriting pipeline automatically:

1. Pulls live closed comparable sales from RentCast (real MLS closed-sale comps, not active listings or Zestimate-style estimates)
2. AI reviews and validates each comp — checking square footage match, proximity, sale recency, and property type — and categorizes them as strong, acceptable, or weak
3. AI synthesizes an ARV, weighing the comp-based reasoning against RentCast's own AVM estimate, and provides its reasoning in plain English
4. Repair cost estimates are calculated based on property condition assessment
5. Maximum Allowable Offer (MAO) is calculated at the team's configured margin
6. A full investment report is generated — highlights, risks, comp analysis, ARV reasoning, and offer recommendation
7. A PDF is exported with one click — formatted and ready to share with a seller or JV partner

Every deal is stored in the dashboard with a full audit trail. Analytics show deals by status, ARV distribution, offer ranges, and more.

#### What It Does (Technical View)

**Pipeline Architecture (`app/api/underwrite/route.ts`):**
The underwriting pipeline runs as a sequential multi-step process. Each step is a distinct AI or API call, run in order, with outputs feeding the next step.

**Step 1 — Address Normalization + Property Lookup**
- Property details are fetched and normalized before comps are pulled
- Axesso API (`lib/underwriting/axesso.ts`) handles photo lookups and address-only manual comp resolution where needed

**Step 2 — Comps Retrieval (RentCast)**
- `lib/underwriting/rentcast.ts` calls RentCast's `searchComps` endpoint with the normalized address
- Returns closed-sale comparables filtered by radius, square footage range, and sale date
- RentCast also returns its own AVM estimate, which is used as a reference point in the ARV synthesis step

**Step 3 — Condition Assessment (Claude)**
- `assessPropertyCondition()` in `lib/underwriting/claude.ts` calls Claude with property details and any available photos
- Returns a structured condition grade (Excellent / Good / Fair / Poor) with reasoning — used to select repair cost ranges in the calculations step

**Step 4 — Comp Validation & Categorization (Claude)**
- `validateAndCategorizeComps()` takes the raw RentCast comps and runs them through Claude
- Claude evaluates each comp for: square footage match, proximity, sale recency, property type match, and overall reliability
- Returns categorized comps with confidence scores — weak comps are flagged and weighted less in the ARV calculation

**Step 5 — ARV Synthesis (Claude)**
- `synthesizeARV()` is the most judgment-intensive step
- Claude receives: the validated comps with their categories, the RentCast AVM estimate, and the condition assessment
- It reasons through the comp-based ARV vs. the AVM estimate and produces a reconciled ARV with plain-English reasoning explaining what it weighted and why
- This is necessary because RentCast's "comps" include active and inactive listings, not only closed sales — so the AVM needs to be validated against actual closed-sale evidence

**Step 6 — Calculations (Deterministic)**
- `lib/underwriting/calculations.ts` runs all deterministic math — repair cost range by condition grade, MAO at configured margin percentage, ARV adjustment bounds
- This is intentionally kept separate from AI steps so the math is always auditable and consistent

**Step 7 — Report Generation (Claude)**
- `generateUnderwritingReport()` takes all prior outputs and generates the narrative investment report
- Covers: property overview, comp analysis summary, ARV reasoning, investment highlights, risk flags, and offer recommendation

**Step 8 — PDF Export**
- `lib/underwriting/pdf/deal-pdf.tsx` renders the report as a React PDF using `@react-pdf/renderer`
- Served from a dedicated API route `app/api/deals/[id]/pdf/route.tsx`
- Download triggered client-side with a single button click

**Storage:**
- Deal data stored across `deals` and `underwriting_reports` tables
- RLS policies allow: deal creator sees own deals, admin sees company deals, super_admin sees all
- All 4 Claude steps aggregate token usage and cost, logged once to `ai_usage_logs` at pipeline end
- Wallet deducted after pipeline completes

**Stack:**
- RentCast API (comps, AVM)
- Axesso API (photos, address resolution)
- Anthropic Claude (condition assessment, comp validation, ARV synthesis, report generation — 4 separate calls per deal)
- `@react-pdf/renderer` for PDF export
- Supabase Postgres

---

### MODULE 4: AI Note Taker

**Tagline:** Every Call Captured, Structured, And Saved — Without Lifting A Finger

---

#### Business Problem It Solves

Reps cannot simultaneously close deals on the phone and accurately document what was said. The result is always the same: CRM notes are missing, incomplete, or written from memory 30 minutes later. Key information — seller motivation, price expectations, property condition, follow-up commitments — gets lost between the call and the next touchpoint.

Management had no searchable record of what was discussed with each lead. Follow-ups were generic because no one knew what was said on the first call.

#### What It Does (Business View)

When a call ends in GoHighLevel, the recording is automatically sent to the AI Note Taker. The system transcribes the full conversation and generates:

- A structured call summary highlighting the key moments
- Extracted data points: seller motivation, asking price, property condition, timeline, follow-up commitments made
- Automatic population of CRM fields based on what was said — no rep input required
- A searchable log of every note, filterable by date, agent, and lead

Reps no longer need to type a single word after a call. Management has a searchable, structured record of every conversation.

#### What It Does (Technical View)

**Ingestion:**
- GoHighLevel sends a webhook to `/api/note-taker/ingest` after each call with the recording and transcript
- Same webhook secret authentication pattern as Sales Coach and Training Coach
- Company matched via `location_id`, rep matched via `agent_name`

**AI Processing:**
- Claude receives the transcript and is prompted to extract structured fields — not generate a free-form summary, but populate specific fields relevant to real estate acquisition conversations
- Output includes: call summary, seller motivation classification, key objections raised, price expectations mentioned, property condition indicators, and follow-up actions promised by the rep
- All extracted fields are stored as structured JSONB alongside the full transcript

**CRM Write-Back:**
- Extracted fields are sent back to GoHighLevel via the GHL API, populating custom fields on the contact record
- This closes the loop: the note lives both in the KPI Driver platform and in the CRM simultaneously

**Storage:**
- `note_taker_logs` table stores transcript, structured extraction, and raw webhook payload
- Searchable, filterable dashboard with date range, agent, and full-text search on notes

---

### MODULE 5: AI Skiptracing

**Tagline:** Skiptrace Any Lead From Your CRM. Results Logged Automatically.

---

#### Business Problem It Solves

Finding accurate contact information for off-market real estate leads requires skip tracing — but the process was entirely manual: run a search on a third-party site, copy results into a spreadsheet, then manually enter them into the CRM. There was no audit trail, no per-lead history, and no way to see which leads had already been searched.

Teams were also running DNC (Do Not Call) and litigator scrubs manually before outreach — a compliance requirement that was easy to miss.

#### What It Does (Business View)

Skip tracing is now triggered directly from a GoHighLevel workflow — when a lead reaches a certain stage, the workflow fires a request to the platform automatically. The platform runs the lookup, logs the results, and makes them available in the dashboard instantly.

Three lookup types are supported:

- **Standard Skiptrace** — given an address (and optionally a name), returns phone numbers and email addresses for the associated contacts
- **APN Lookup** — given a parcel ID (APN), returns property and ownership information
- **DNC / Litigator Scrub** — checks a contact against national Do Not Call and litigator databases before outreach

All results are logged per company with full detail: lookup type, input data, result data, date, credit cost. The detail modal for each record shows all returned phones, emails, and identity fields in a structured layout.

Credits are deducted per lookup from the company wallet.

#### What It Does (Technical View)

**Ingestion:**
- `/api/skip-tracing/ingest` receives requests from GoHighLevel workflows via n8n
- Webhook secret authentication — same pattern as all other ingest routes
- Company matched via `location_id`

**Payload Detection:**
- The route inspects the payload shape to determine lookup type:
  - Has `parcel_id` → APN lookup
  - Has `national_dnc` → DNC scrub
  - Has `address` → standard skiptrace
- This means n8n can route all three lookup types to the same endpoint without needing separate webhook URLs

**Tracerfy Integration:**
- The actual lookup is performed via the Tracerfy API
- Results are returned in a type-specific format and stored as JSONB in `skip_tracing_logs`
- Indexed columns (`lookup_type`, `result_status`, `company_id`, `created_at`) are stored separately from the JSONB payload for efficient filtering

**Billing:**
- Credit cost per lookup is configured in `billing_config` per lookup type
- Deduction = `credits × credit_cost_usd × multiplier` from company wallet
- Wallet balance is checked before the lookup is run — insufficient balance returns a 402

**Database:**
- `skip_tracing_logs` table with RLS — company-scoped access
- `billing_config` extended to include `skip_tracing` as a valid app type
- `company_wallet_transactions` extended to include `skip_tracing` as a valid transaction app

---

### MODULE 6: AI Data Enrichment

**Tagline:** Every Lead Enriched. Every Field Filled. Automatically.

---

#### Business Problem It Solves

Real estate lead databases are incomplete by default — you might have an address but no owner name, or an owner name but no phone, or a phone but no property details. Enriching leads manually is time-consuming and inconsistent — different team members look up different fields, and the results rarely make it back into the CRM cleanly.

#### What It Does (Business View)

When a lead enters a workflow in GoHighLevel and reaches an enrichment stage, the platform automatically enriches it with available data: ownership history, property details, market data, and investment signals. The result is written back to the CRM and logged in the platform dashboard for full visibility.

Every enrichment is logged with the input data, the returned data, and the timestamp — so there's a complete audit trail of what was added to each record and when.

#### What It Does (Technical View)

**Ingestion:**
- `/api/data-enrichment/ingest` receives enrichment requests from n8n/GoHighLevel workflows
- Same authentication and company matching pattern as other routes

**Processing:**
- Enrichment data is returned from configured third-party APIs and structured into the platform's schema
- All enriched fields are stored as JSONB in `data_enrichment_logs` alongside the raw webhook payload

**Storage + Display:**
- Per-record detail view in the dashboard shows all enriched fields in a structured layout
- Filter by date range, result status, and company (super_admin)
- Full enrichment audit trail — every record shows exactly what data was returned

---

## PLATFORM ARCHITECTURE

**Section Headline:**
Enterprise-Grade Infrastructure. Designed To Scale.

---

### Frontend

**Framework:** Next.js 15 (App Router)
The entire platform is a single Next.js application using the App Router with React Server Components. Server components handle data fetching and access control; client components handle interactivity. This architecture eliminates loading waterfalls for most pages — data is fetched on the server and arrives with the initial HTML.

**Structure:**
The application uses a route-group architecture to host six independent product surfaces under one deployment:
- `/sales-coach/*` — AI Sales Coach
- `/training-coach/*` — AI Training Coach
- `/underwriting/*` — AI Deal Underwriter
- `/note-taker/*` — AI Note Taker
- `/data-enrichment/*` — AI Data Enrichment
- `/skip-tracing/*` — AI Skiptracing
- `/(platform)/*` — Shared dashboard, billing, admin, company settings
- `/(auth)/*` — Login, invite flow, password set, auth callback

**Styling:** Tailwind CSS v4 with `@theme` tokens, `cn()` (clsx + tailwind-merge), fixed brand palette enforced via design tokens

**Charts:** Recharts (AreaChart, BarChart, ResponsiveContainer) for all analytics pages

**UI Components:** Custom component library — no off-the-shelf design system. All components built to match brand identity.

---

### Backend / API

**Runtime:** Next.js API Routes (server-side, no separate backend service)

**Authentication:** Supabase Auth with SSR session handling via `@supabase/ssr`
- Browser client (`lib/supabase/client.ts`) for client-side queries
- Server client (`lib/supabase/server.ts`) for RSC and server actions (cookie-based session)
- Admin client (`lib/supabase/admin.ts`) using service role key — bypasses RLS, used exclusively for webhook/ingest routes and admin server actions

**Middleware (`middleware.ts`):**
- Every request is intercepted by a single Next.js middleware
- Refreshes the Supabase session on every request (required for SSR auth)
- Public paths (webhook endpoints, auth routes) are allowlisted and skip all checks
- App-gated paths (`/sales-coach`, `/training-coach`, `/underwriting`, etc.) check per-user app access flags from the `users` table
- Role-based redirect: `super_admin` always passes, `admin` without flag redirects to access request form, `user` without flag redirects to dashboard with a "contact your admin" message

**Server Actions:** Next.js server actions used for all form submissions and mutations — no separate REST API needed for UI interactions

---

### Database

**Platform:** Supabase (hosted Postgres)

**Row Level Security:** Every table has RLS policies. Users can only read their own company's data. Admins see their company. Super admins see all. Webhook routes bypass RLS via the service-role admin client.

**Key Tables:**
- `companies` — company record, `wallet_balance`, `stripe_customer_id`, `ghl_sub_account_id`
- `users` — `access_role`, `agent_type`, per-app boolean flags (`app_sales_coach`, `app_underwriting`, etc.), `is_active`
- `live_calls` — scored calls with `evaluation` JSONB, `score`, `agent_type`, `direction`, `duration`
- `training_calls` — same structure as `live_calls`, separate table
- `training_ai_agents` — bot personas with `phone_number`, `name`, `description`, `company_id` (null = global)
- `user_phones` — one-to-many rep phone registrations for training call matching
- `deals` + `underwriting_reports` — deal pipeline and full AI report output
- `note_taker_logs` — transcripts, structured extraction, raw payload
- `skip_tracing_logs` — lookup results, type-specific indexed columns + JSONB payload
- `data_enrichment_logs` — enrichment results per record
- `ai_usage_logs` — one row per completed AI workflow: tokens, cost, model, entity, company, app
- `company_wallet_transactions` — full debit/credit ledger per company
- `billing_config` — per-app AI cost multiplier, credit cost per lookup (super admin editable)

**Migrations:** Sequential SQL migrations in `supabase/migrations/` — applied manually

---

### AI / Claude Integration

**Provider:** Anthropic Claude via official SDK

**Use Cases & Models:**
- **Call Scoring** (Sales Coach + Training Coach): structured JSON output from transcript — evaluated against rubric categories with penalties/bonuses/coaching actions
- **Property Condition Assessment** (Underwriting): grades property condition from listing details and photos
- **Comp Validation & Categorization** (Underwriting): evaluates reliability of each comparable sale
- **ARV Synthesis** (Underwriting): reconciles comp-based ARV with AVM estimate using chain-of-thought reasoning
- **Investment Report Generation** (Underwriting): generates narrative investment analysis from all prior outputs
- **Call Transcription & Field Extraction** (Note Taker): extracts structured fields from conversation transcript

**Separate API Keys Per Module:**
- `ANTHROPIC_API_KEY_SALES_COACH` — used for all call scoring (live + training)
- `ANTHROPIC_API_KEY_DEAL_UNDERWRITER` — used for all underwriting steps

**Token + Cost Tracking:**
Every AI call captures input tokens, output tokens, and estimated cost from the API response. These are aggregated per workflow and written to `ai_usage_logs` after the workflow completes (fire-and-forget, never blocks the response).

---

### Billing System

**Platform:** Stripe

**Model:** Company wallet — not per-user subscriptions. Each company has a `wallet_balance` in USD. Every AI action deducts from the wallet at: `AI cost × per-app multiplier`.

**Top-Up Flow:**
- If a saved payment method exists on the company's Stripe customer: charges the card directly (off-session PaymentIntent), credits wallet immediately — no redirect
- If no saved card: creates a Stripe Checkout session and redirects to hosted payment page
- Stripe webhook (`payment_intent.succeeded`) acts as an idempotent safety net for wallet credits
- Payment intents include `description` and `metadata` (`companyId`) for full visibility in the Stripe dashboard

**Multipliers:**
Super admin can set a per-app markup multiplier (e.g., 1.3 = 30% markup over raw AI cost) from the billing config page. This takes effect on the next request — no deploy required.

**Per-App Credit Costs:**
For modules that aren't billed by AI token (skip tracing, data enrichment), a `credit_cost_usd` value in `billing_config` determines the deduction amount per lookup.

**Transaction Ledger:**
Every wallet deduction and top-up is recorded in `company_wallet_transactions` with: amount, direction, description, app, entity reference, and Stripe payment intent ID (for top-ups — used for idempotency).

---

### GoHighLevel Integration

**Architecture:** All integration is inbound webhook — GHL fires webhooks to the platform; the platform never polls GHL.

**Sub-Account Matching:** Every webhook payload includes a `location_id` (GHL's sub-account identifier). The platform matches this to a company via `companies.ghl_sub_account_id`. This means the platform is multi-tenant by sub-account — each GHL sub-account maps to exactly one company.

**Webhook Security:** Every public API route requires an `x-webhook-secret` header matching an environment variable. No Supabase session required — these routes are designed for machine-to-machine communication and are excluded from middleware auth checks.

**CRM Write-Back:** The Note Taker module writes extracted fields back to GHL contact records via the GHL API, closing the loop between the AI extraction and the CRM.

---

### Access Control & Multi-Tenancy

**Roles:** Three roles with layered permissions:
- `user` — sees own data only, no billing or admin access
- `admin` — sees company data, manages users, accesses billing, manages company settings
- `super_admin` — sees all companies, manages billing config, sets per-app multipliers, creates/manages global AI training personas

**App Access Flags:** Per-user boolean flags on the `users` table control access to each module (`app_sales_coach`, `app_underwriting`, etc.). Admins set these at invite time via the user management page. Super admins always have access to all modules regardless of flags.

**Agent Type:** `users.agent_type` ∈ `fus | acq | tc | cc | none` — determines which scoring rubric is applied to that rep's calls and how they are filtered and grouped in analytics.

**Invite Flow:**
- Admin invites a user by email with role, agent type, and app flags pre-set
- Invite email sent via Resend (configured as Supabase custom SMTP — bypasses Supabase's free-tier rate limit)
- Email uses OTP/token_hash flow for reliable delivery through corporate email filters
- New user clicks link → OTP verified server-side → redirected to set-password page → account activated

---

## SUMMARY OF WHAT WAS BUILT

| Module | AI Calls Per Event | Data Source | Trigger |
|---|---|---|---|
| AI Sales Coach | 1 (scoring) | GHL webhook | After every live call |
| AI Training Coach | 1 (scoring) | Assistable webhook | After every training call |
| AI Deal Underwriter | 4 (condition, comps, ARV, report) | RentCast + Axesso | Manual (rep submits address) |
| AI Note Taker | 1 (extraction) | GHL webhook | After every call |
| AI Skiptracing | 0 (API lookup) | Tracerfy | GHL workflow trigger |
| AI Data Enrichment | 0 (API lookup) | 3rd party enrichment | GHL workflow trigger |

**Total custom tables:** 15+
**Total API routes (ingest + billing + admin):** 12+
**Total pages/views:** 20+
**Roles:** 3 (user, admin, super_admin)
**Companies (multi-tenant):** Unlimited
**AI providers:** Anthropic Claude
**Payment provider:** Stripe
**CRM:** GoHighLevel (via webhook)

---

## TECH STACK SUMMARY

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth + SSR |
| AI | Anthropic Claude |
| Payments | Stripe |
| Email | Resend |
| CRM Integration | GoHighLevel (webhooks) |
| Voice Bot | Assistable AI |
| Comps / AVM | RentCast |
| Skip Tracing | Tracerfy |
| Property Data | Axesso |
| PDF Export | @react-pdf/renderer |
| Charts | Recharts |
| Monorepo | pnpm + Turborepo |
| Deployment | Vercel (recommended) |

---

## BRAND / DESIGN NOTES

**Brand Colors:**
| Name | Hex | Use |
|---|---|---|
| Dark Navy | `#0D1C2A` | Page background |
| Blue | `#307DC0` | Primary accent, CTAs, active nav |
| Green | `#43B749` | Success, positive scores, bonuses |
| Yellow | `#FCAF17` | Warnings, medium scores |
| Red | `#ED1F24` | Errors, penalties, low scores |
| White | `#FFFFFF` | Body text, card text |

**Design System:**
- Dark-first (navy background throughout)
- Card-based layouts with subtle borders (`rgba(255,255,255,0.08)`)
- Gradient active states on nav items
- Custom dark-themed calendar / date picker component
- No third-party component library — all UI built custom

---

## CALL TO ACTION SECTION

**Headline:**
We Build AI Operations Infrastructure For Real Estate Companies

**Body:**
This is the kind of work we do — not off-the-shelf tools, not chatbot wrappers, but deeply integrated AI systems built around how your business actually operates. If you're running a real estate acquisition business and want to automate your operations with AI, let's talk.

**Primary CTA:** Book A Discovery Call
**Secondary CTA:** See More Of Our Work
