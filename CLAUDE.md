# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is a pnpm + Turborepo monorepo. Run commands from the repo root unless noted.

```bash
pnpm install            # install all workspace deps
pnpm dev                # turbo dev — runs apps/web on localhost:3000
pnpm build              # turbo build (all packages, dependency-ordered)
pnpm lint               # turbo lint (next lint in apps/web)
pnpm type-check         # turbo type-check (tsc --noEmit in each package)
pnpm format             # prettier --write across ts/tsx/md
```

There is no test runner configured in this repo (no Jest/Vitest/Playwright). Don't assume one exists.

To type-check or lint only `apps/web` directly (faster than the turbo root command):
```bash
cd apps/web
npx tsc --noEmit
npx next lint
```

## Architecture

### Monorepo layout

- `apps/web` — the only deployable app. A single Next.js 15 (App Router) instance that hosts **three independent product surfaces** plus shared platform/billing pages, all path-routed (not subdomained):
  - `/underwriting/*` — AI Underwriting tool
  - `/sales-coach/*` — AI Sales Coach tool
  - `/training-coach/*` — AI Training Coach tool (scores AI role-play practice calls; standalone from Sales Coach even though it reuses the same scoring pipeline)
  - `/(platform)/*` — shared dashboard + billing, outside any one tool
  - `/(auth)/*` — login, password set, auth callback/confirm
- `packages/auth` (`@kpidriver/auth`) — Supabase SSR client wrappers: `client.ts` (browser), `server.ts` (RSC/server actions), `middleware.ts` (session refresh for `middleware.ts`), `types.ts` (shared `AppId`/`PlanId`/`Subscription` types).
- `packages/stripe` (`@kpidriver/stripe`) — `plans.ts` (plan/app-access matrix), `client.ts`, `subscription.ts`, `webhook.ts`, `credits.ts`, `payment-methods.ts`, `topup.ts`.
- `packages/tsconfig` — shared base/Next.js `tsconfig.json`s consumed via `extends`.

New apps are added as a new route group under `apps/web/app/`, plus an entry in `middleware.ts`'s `APP_GATE` array.

### Auth + access gating (`apps/web/middleware.ts`)

Single middleware handles all apps:
1. Requests to `PUBLIC_PATHS` (`/login`, `/auth/callback`, `/auth/confirm`, `/auth/invite-callback`, `/auth/set-password`, `/api/stripe/webhook`, `/api/calls/ingest`, `/api/training-coach/ingest`) skip all checks.
2. Otherwise, `updateSession()` refreshes the Supabase session; no user → redirect to `/login`.
3. If the path matches an `APP_GATE` prefix (`/underwriting`, `/sales-coach`, `/training-coach`), the user's `app_underwriting` / `app_sales_coach` / `app_training_coach` boolean columns on the `users` table are checked. `admin` and `super_admin` always pass regardless of flags. No access → redirect to `/dashboard`.

**App access is now per-user, admin-managed** (not Stripe subscription based). Flags live on `users.app_underwriting`, `users.app_sales_coach`, `users.app_training_coach` (added by migration `007_user_app_access.sql`). Admins set these at invite time via `/admin/users`. The legacy per-user Stripe subscription gate has been removed from middleware; the subscription query is kept only for plan-name display in the sidebar.

`/billing` and `/admin/users` redirect `user` role to `/dashboard` at the page level. `PlatformShell` also hides the Users nav item, Billing nav item, and Company Settings from non-admins client-side.

### Sales Coach (`app/sales-coach/*`)

- **Roles**: `users.access_role` ∈ `super_admin | admin | user` (scopes visibility: own calls / own company / all companies). `users.agent_type` ∈ `fus | acq | tc | cc | none` (rep specialization — FUS = setter, ACQ = closer — used for scoring rubric selection and as a UI filter).
- **Call ingestion** (`app/api/calls/ingest/route.ts`, training variant at `app/api/calls/training-ingest/route.ts`): authenticated via `x-webhook-secret` header (not Supabase session — hence the middleware bypass). Looks up the company by `companies.ghl_sub_account_id = location_id`, then the agent by `ilike(users.full_name, agent_name)` scoped to that company. `agent_phone` is stored for reference only and is no longer used for matching.
- **Scoring** (`lib/sales-coach/anthropic/scorer.ts` + `rubrics.ts`): calls Anthropic (`ANTHROPIC_API_KEY_SALES_COACH`) with a rubric selected by `agent_type` to produce `live_calls.evaluation` (penalties/bonuses/category scores/coaching actions) and `live_calls.score`.
- **Pages**: `analytics`, `live-calls`, `leaderboard` each follow a server `page.tsx` (auth + role-scoped Supabase query) → client `*-client.tsx` (filtering/charts) split. Filter state (period, direction, duration, role, scorable, lead source, agent multi-select) is computed client-side over the full fetched call set, not via server-side query params.
- **Admin/super-admin** (`app/sales-coach/admin/*`, `app/sales-coach/super-admin/*`): the shared `Sidebar` + `ContentShell` shell is rendered once by `app/sales-coach/layout.tsx` — nested `admin/layout.tsx` and `super-admin/layout.tsx` must only do auth/role checks and return `children` directly, not re-render the shell (it nests under the parent layout automatically via the route tree).

### Training Coach (`app/training-coach/*`)

- Standalone app (own sidebar/layout, own taskbar entry on the platform home page) for scoring AI role-play practice calls — **not** a tab inside Sales Coach. It was split out specifically because it needs separate access/unlock from Sales Coach.
- **Ingestion** (`app/api/training-coach/ingest/route.ts`): receives Assistable AI's native post-call webhook directly (no n8n routing — Assistable fires this URL itself), authenticated the same way as `api/calls/ingest` (`x-webhook-secret` header). Maps three fields from the payload:
  - `location_id` → `companies.ghl_sub_account_id` (same lookup live calls use)
  - `from` (the rep's phone) → `user_phones.phone` (migration `008_user_phones.sql`) — one user can register multiple numbers. Match gives a `user_id`; a second query then verifies that user belongs to the resolved company and `is_active = true`. **This is the scoring gate**: no match means the call is rejected (404) before `scoreCall()` is ever invoked, so an unidentifiable rep never costs an Anthropic call and is never persisted (`training_calls.user_id` is `NOT NULL`, so there'd be nowhere to put it anyway). Reps add their numbers at `/training-coach/my-numbers`.
  - `to` (the AI bot's own fixed number, assigned in Assistable) → `training_ai_agents.phone_number` — best-effort only; an unrecognized bot number still gets scored and saved with `ai_agent_id: null`, it just won't display an agent name
  - Idempotent on `external_call_id` (Assistable's `call_id`) in case the webhook retries delivery.
- **AI agent registry** (`training_ai_agents` table, migration `003_training_coach.sql`): company admins self-register each bot's name + number at `/training-coach/agents` (`app/actions/training-coach/agents.ts`). Phone numbers are globally unique (DB constraint) since they're real telecom numbers Assistable assigned.
- **Scoring**: reuses `scoreCall()` from `lib/sales-coach/anthropic/scorer.ts` verbatim, keyed by the rep's `agent_type` — same rubrics, same `evaluation` shape as live calls, just written to `training_calls` instead of `live_calls`.
- Replaced the old `/api/calls/training-ingest` route entirely (deleted) — that one matched by `agent_phone` only and was never live/configured with a real n8n→training pipeline, so there was nothing to keep backwards-compatible.

### Underwriting (`app/underwriting/*`)

- **Data flow for a deal** (`app/api/underwrite/route.ts`): RentCast (`lib/underwriting/rentcast.ts`) is the source of truth for comps via `searchComps`; Axesso (`lib/underwriting/axesso.ts`) is used only for photo lookups (`fetchPhotosByAddress`) and address-only manual-comp resolution (`searchProperty`). Manual comps with insufficient data fall back to an Axesso property search to fill in sqft/sale price/photos.
- Claude (`lib/underwriting/claude.ts`, `ANTHROPIC_API_KEY_DEAL_UNDERWRITER`) performs multiple roles in the pipeline: `assessPropertyCondition`, `validateAndCategorizeComps`, `synthesizeARV` (reconciles RentCast's AVM estimate against comp-based reasoning — RentCast's comps are active/inactive listings, not closed sales, so this is a judgment call rather than a deterministic average), and `generateUnderwritingReport`.
- Deterministic math (repair costs, max offer, ARV adjustment bounds) lives in `lib/underwriting/calculations.ts` and is intentionally kept separate from the AI-driven steps.
- PDF export: `lib/underwriting/pdf/deal-pdf.tsx` (via `@react-pdf/renderer`), served from `app/api/deals/[id]/pdf/route.tsx`.

### Database

Supabase Postgres. Migrations in `supabase/migrations/` (`001_subscriptions.sql`, `002_combined_schema.sql`, `002_credits.sql`, `003_training_coach.sql`) — there is no migration tool wired up; apply these manually against the Supabase project. Three Supabase client factories in `apps/web/lib/supabase/`: `server.ts` (RSC, cookie-based session), `client.ts` (browser), `admin.ts` (service-role, bypasses RLS — used for webhook/ingest routes and admin actions).

### Styling conventions

- Tailwind CSS v4 with `@theme` tokens in `app/globals.css`. `cn()` (`lib/utils.ts`) wraps `clsx` + `tailwind-merge`.
- Brand palette is fixed and should be used verbatim, not approximated: white `#FFFFFF`, light blue `#307DC0`, dark navy `#0D1C2A` (page background), red `#ED1F24`, yellow `#FCAF17`, green `#43B749`.
- `components/ui/select.tsx`'s `SelectTrigger` has `w-full` in its base class (relied on by modal/form usages) — filter-bar usages must override with an explicit `w-auto` per call site rather than changing the shared component, or selects will stack one-per-row in a `flex-wrap` row.
- Sales Coach and Underwriting each have their own component trees (`components/sales-coach/*`, `components/underwriting/*`) and are not visually unified by design — don't share components across them without checking both still look correct.

## Progress log

Append a dated, terse entry here whenever a non-trivial change ships, so future sessions don't have to re-derive history from chat logs. Newest entry on top. Keep each entry to a few lines — what shipped and why, not a diff.

### 2026-11-24 — Sales Coach V2 scoring system

- **`lib/sales-coach/anthropic/rubrics.ts`** — complete rewrite. Exports `SystemFacts`, `selectFromBlock()` (deterministic TypeScript stage→FROM block lookup, 25+ cases), `SCORER_SYSTEM_PROMPT` (full V2 rubric anchors cached via `cache_control: ephemeral`), `CALL_STAGE_MAP`.
- **`lib/sales-coach/anthropic/scorer.ts`** — complete rewrite. New `ScoreResult` interface with V2 fields (`from_block`, `to_block`, `tw_applied`, `core_score`, `from_score`, `to_score`, `criteria[]`, `metrics`, `coaching`, `auto_fail`, `flags[]`). Formula: `SCORE = AGENT CORE (60) + FROM (20) + TO (20)`. TW special case (40 pts, replaces FROM+TO). Critical miss cap at 70. Penalties P1-P4. Auto-fails AF1-AF5. Max 6000 tokens.
- **`app/api/calls/ingest/route.ts`** — added `contact_id` and `disposition` fields. Computes system facts SF1-SF3 from prior call DB query before scoring. Stores full V2 `evaluation` JSONB shape.
- **`app/api/training-coach/ingest/route.ts`** — updated `fallbackScoreResult()` to V2 shape; stores V2 `evaluation` JSONB.
- **`supabase/migrations/068_live_calls_contact_id.sql`** — adds `contact_id text` + composite index to `live_calls`. Already applied.
- **Live calls detail modal** — V2 calls show: FROM/TO block pills, score breakdown bars (Core/FROM/TO), criteria list (color-coded bands), coaching (Worked/Fix/Try This Line), V2 penalty shape. V1 calls retain existing display (category scores, strengths/missed, coaching actions, evidence). Header badges for AUTO-FAIL, Critical Miss, Disposition Mismatch.
- **Leaderboard** — ranks on `core_score/60*100` (normalized) for V2 calls, raw `score` for V1. Podium and table show actual `core_score /60` for V2 reps. "Avg Core Score" column header.

### 2026-10-02 — KPI Dashboard: GHL webhook ingest (lead submissions)

- `lib/kpi/webhook-registry.ts` — living registry documenting every GHL automation that sends to `/api/kpi/ingest`. Each entry records: GHL folder path, automation name, `type` discriminator value, `kpi_name`/`kpi_type`, status (planned/built/live), and every field with its GHL variable, TypeScript type, required flag, and target column. Adding a new automation = add entry here + add dispatch case in the route.
- `app/api/kpi/ingest/route.ts` — single endpoint for all KPI webhooks. Auth: `x-webhook-secret`. Dispatches on `body.type`. Unknown types are saved to `kpi_unknown_events` (not dropped silently). Currently handles: `08.1 - Lead Submission Form` and `08.2 - CSV Lead Submission` (both map to `kpi_events` with `kpi_name='lead'`, `kpi_type='ACQ'`). Resolves company via `location_id`. Attempts user_id resolution from `acq` name via `ilike`. Overflow fields (`fus`, `score`, `feedback`, `kpi_raw`, `date_created`, `source_automation`) go into `metadata` JSONB.
- Migration `057_kpi_unknown_events.sql` — catch-all table for unrecognised webhook types; super_admin SELECT only.
- `/api/kpi/ingest` was already in `PUBLIC_PATHS` in `middleware.ts` — no change needed.
- Data lands in `kpi_events` (migration 055) — no new table required.

### 2026-09-30 — Billing profit tracking (provider_cost_usd)

- Migration `056_provider_cost_usd.sql`: adds `provider_cost_usd numeric(12,6)` to `ai_usage_logs` and `skip_tracing_logs`; adds `de_cost_per_call_usd` to `billing_config` for data enrichment provider rate; creates `get_all_companies_profit_summary()` RPC that unions both tables and returns `(company_id, total_billed, total_cost, profit)`.
- `lib/ai-usage.ts`: `UsageLog` interface gains optional `provider_cost_usd?: number`.
- All 6 ingest routes now snapshot provider cost at run time alongside charged price:
  - `api/calls/ingest`: fetches `claude_input/output_cost_per_m`, computes `providerCostUsd` from tokens × actual rate.
  - `api/training-coach/ingest`: fetches `assistable_cost_per_min` + claude cost columns.
  - `api/underwrite/route.ts`: uses existing `claudeActualCostUsd` (hardcoded Anthropic Opus rates) + `RENTCAST_COST_USD` × calls + `AXESSO_COST_USD` × calls.
  - `api/note-taker/ingest`: fetches `nt_whisper/gpt_input/gpt_output_cost_per_*` columns.
  - `api/data-enrichment/ingest`: fetches new `de_cost_per_call_usd` column.
  - `api/skip-tracing/ingest`: fetches `st_*_rate_usd` columns, saves `provider_cost_usd` to `skip_tracing_logs` row directly.
- Super admin companies page: calls `get_all_companies_profit_summary()` RPC, adds `total_billed`, `total_cost`, `profit` to each row. Client shows 3 new right-aligned columns: Total Billed / Total Cost / Profit (green when positive).

### 2026-07-07 — Unified sidebar (PlatformSidebar) + date filter standardization

**Unified PlatformSidebar:**
- New `components/platform/PlatformSidebar.tsx` ("use client") replaces all per-app sidebars. Fixed-positioned, 248px wide, rendered by every app layout and PlatformShell.
- App sub-nav auto-expands via Framer Motion AnimatePresence when the active route matches an app's href. Locked apps show the entry but no expandable items.
- `SubNavItem` type supports `minRole?: 'admin' | 'super_admin'` for role-filtered accordion items.
- `app-data.ts` is the single source of truth for `APP_REGISTRY`, `Access`, `SubNavItem`, `AppEntry`.
- All six app layouts (`sales-coach`, `training-coach`, `underwriting`, `note-taker`, `data-enrichment`, `skip-tracing`) rewired to use PlatformSidebar. Underwriting layout uses a wrapper div with `marginLeft: 248` (its ContentShell was flex-based, not fixed-offset).

**Date filter standardization:**
- New `components/ui/date-range-picker.tsx` exports `DateRangePicker` component, `DatePeriod` type, `DATE_PRESETS`, and `periodBounds()` helper.
- Presets: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, All Time, Custom.
- Custom picker: styled card with From/To labels, Calendar icon, `color-scheme: dark` date inputs.
- Applied to all analytics/logs pages: SC Analytics, SC Live Calls, SC Leaderboard, Training Coach, Note Taker, Data Enrichment, Skip Tracing.
- SC Live Calls: removed raw dateFrom/dateTo inputs from filter bar; DateRangePicker added to header (right side, below stats). Default period "today".
- Training Coach: added DateRangePicker to header (was missing date filter entirely); removed raw date inputs from filter bar. Default "today".
- Note Taker / Data Enrichment: replaced custom period button groups with DateRangePicker. Added custom date support (was missing).
- Skip Tracing: replaced FilterPills period section with DateRangePicker. Default "all".

### 2026-07-07 — Skip Tracing app + structural refactors

**Skip Tracing app (`/skip-tracing/*`):**
- New app for Tracerfy API-powered lookups routed from n8n. No AI tokens — uses credits only.
- Three flow types detected by payload shape: `apn` (has `parcel_id`), `dnc` (has `national_dnc`), `skiptrace` (has `address`). Each persists type-specific indexed columns + full `payload` JSONB to `skip_tracing_logs`.
- Ingest route `api/skip-tracing/ingest`: authenticates via `x-webhook-secret`, matches company by `location_id`, deducts `credits × credit_cost_usd × multiplier` from wallet.
- Migration `015_skip_tracing.sql`: expands `billing_config` and `company_wallet_transactions` CHECK constraints to include `skip_tracing`; adds `credit_cost_usd` column to `billing_config`; creates `skip_tracing_logs` table with RLS; adds `app_skip_tracing boolean` to `users`.
- UI: `app/skip-tracing/page.tsx` (server, super_admin sees all companies), `skip-tracing-client.tsx` (stats header, filter bar with flow/result/period/search, table, detail modal with collapsible PersonCards showing phones/emails for APN+skiptrace and DNC flag chips for DNC flow).
- `app_skip_tracing` propagated to: middleware gate + PUBLIC_PATH, `app-data.ts` Access type + APP_REGISTRY entry, admin users page (select, table chip, invite + edit modals), server action interfaces + DB calls, all platform pages that build the `access` object (dashboard, billing, settings/account, settings/company, super-admin/companies, super-admin/billing-config).

**Structural refactors:**
- `components/platform/app-data.ts` — single source of truth for the `Access` interface, `AccessKey` type, and `APP_REGISTRY` array (replaces two independent `APPS` arrays in PlatformShell and dashboard-client). Both files now import from here. PlatformShell re-exports `Access` for the 6 existing consumers that import it from there.
- `components/ui/sidebar-nav-item.tsx` — shared `SidebarNavItem` component replacing a ~35-line `NavItem` function duplicated across 6 sidebar files. Accepts a `pillId` prop (unique per app) to prevent framer-motion `layoutId` collisions across apps. All 5 app sidebars (sc-pill, tc-pill, uw-pill, nt-pill, de-pill) and PlatformShell (platform-pill) now use it.
- Note Taker and Data Enrichment moved from `BOTTOM_NAV` (no access gating) into the main `APPS`/`APP_REGISTRY` array so they receive the same lock/unlock treatment as all other apps.

### 2026-07-02 — UI/UX consistency pass: logo, sidebars, auth pages, dashboard

- KPI Driver logo (`apps/web/public/logo.png`) added to all sidebars (PlatformShell, Sales Coach, Training Coach, Deal Underwriter) and auth pages (login, set-password). Tagline "Built By RE Investors, For RE Investors" rendered inline right of logo with green/dimText alternating color scheme.
- All three app sidebars (Sales Coach, Training Coach, Deal Underwriter) redesigned to match PlatformShell: same logo+tagline header, gradient pill active-nav state, blue dot on active item, "Main Dashboard" back link at top, role badge on user card. Deal Underwriter `Sidebar` now accepts `user` and `accessRole` props passed from `layout.tsx`.
- Deal Underwriter topbar simplified: removed `userEmail` prop chain (layout → content-shell → topbar); topbar is now a clean 56px bar matching PlatformShell header style.
- Dashboard stat cards added: Live Calls Scored, Deals Underwritten, Training Sessions (all scoped to current month / company). Wallet Balance card shown only when `isAdmin && companyId`. Recent activity panel removed entirely.
- Sales Coach admin users page: replaced "Invite User" button with "Manage Users" link → `/admin/users` (platform page). Prevents confusion from per-app invite flow that was leaving new users with locked apps.
- Super admin `/admin/users`: company filter pill bar added; invite modal includes a company selector when caller is `super_admin` (super_admin has no company_id of their own, so it must be chosen at invite time). Server action `inviteUser` accepts optional `company_id` from form.
- Set-password page (`/auth/set-password`): replaced purple/indigo theme with brand blue/green; ParticlesBg background matching login; blue→green gradient lock icon and submit button; logo above card.
- Login page: logo replaces Sparkles icon; "AI-powered real estate platform" inline with logo in same row; copyright line absolutely positioned and centered across full page width.

### 2026-07-01 — Super admin platform section (companies + billing config)

- New `/(platform)/super-admin/companies` — lists all companies with wallet balance and user count; create new company and edit existing (name, GHL sub-account ID, Stripe customer ID). Stripe customer ID field is how super admin pre-links existing GHL Stripe customers so one-click top-up works without card setup.
- New `/(platform)/super-admin/billing-config` — edit per-app AI markup multipliers (underwriting, sales_coach, training_coach) with live markup % preview. Changes take effect immediately on next workflow run (multiplier is fetched fresh per request).
- Server actions in `app/actions/super-admin/companies.ts` and `app/actions/super-admin/billing-config.ts` — both enforce `super_admin` role.
- `PlatformShell` sidebar now shows a "Super Admin" nav section (Companies + Billing Config) visible only when `accessRole === 'super_admin'`.

### 2026-07-01 — Company dollar wallet with one-click Stripe top-up (migration 011)

**DB (migration 011):**
- Added `wallet_balance numeric(12,2)` and `stripe_customer_id text` to `companies`.
- New `company_wallet_transactions` table: per-transaction log (topup/deduction), `stripe_payment_intent_id UNIQUE` for idempotency on top-ups.
- New `billing_config` table: one row per app (`underwriting`, `sales_coach`, `training_coach`), `multiplier` column (default 1.3 = 30% markup). Super-admin editable; seeded with defaults.
- `add_wallet_balance(company_id, amount, description, stripe_payment_intent?)` RPC — idempotent on payment_intent_id; returns new balance.
- `deduct_wallet_balance(company_id, amount, description, app)` RPC — inserts deduction row.

**Stripe package:**
- `packages/stripe/src/subscription.ts` — added `getOrCreateCompanyCustomer(existingId, email, companyId)` for company-scoped Stripe customers.
- `packages/stripe/src/topup.ts` — rewrote `createTopUpCheckoutSession` to take pre-resolved `customerId`+`companyId`; added `chargeWithSavedMethod(customerId, pmId, cents, companyId)` for direct off-session charges.
- `packages/stripe/src/webhook.ts` — added `payment_intent.succeeded` and `payment_intent.payment_failed` to WEBHOOK_EVENTS.
- New `apps/web/lib/stripe/company-customer.ts` — shared helper `getCompanyStripeCustomer(userId, email)` that looks up company's stripe_customer_id, creates if missing, saves back via admin client.

**API routes (all use company customer, not per-user):**
- `api/stripe/topup` — smart: if default PM exists, charges directly (off-session) and credits wallet immediately, returns `{success, newBalance}`. Falls back to Stripe Checkout and returns `{url}` if no card or 3DS required.
- `api/stripe/webhook` — payment mode checkout credits `add_wallet_balance(companyId, ...)`; `payment_intent.succeeded` handler acts as idempotent safety net.
- `api/stripe/setup-intent`, `payment-methods`, `payment-methods/default`, `payment-methods/remove` — all switched from per-user to per-company customer via `getCompanyStripeCustomer`.

**Billing UI:**
- `billing/page.tsx` — fetches `companies.wallet_balance` and `company_wallet_transactions` via admin client; passes to BillingClient.
- `billing-client.tsx` — Transaction type `amount` → `amount_usd`.
- `wallet-tab.tsx` — handles both `{url}` (open checkout) and `{success, newBalance}` (update balance in-place, show green banner). Removed userId/userEmail from props (no longer needed client-side). Payment methods card subtitle updated to explain instant one-click behavior.

**Ingest routes / deduction logic:**
- Live calls (`api/calls/ingest`): removed old `deduct_credit` RPC call; added wallet_balance pre-check on company row; after scoring calls `deduct_wallet_balance(company_id, cost*multiplier, ...)`.
- Training coach (`api/training-coach/ingest`): same wallet pre-check and deduction added.
- Underwriting (`api/underwrite`): wallet pre-check before pipeline; after STEP 15 usage log, deducts `estimatedCostUsd × multiplier` from wallet.
- Deduction amount = `ai_usage_logs.cost_usd × billing_config.multiplier` (per-app). Multiplier is fetched fresh per request so super-admin can change it without a deploy.
- Switched from 6 separate Stripe products with dynamic `price_data` to a single product with 6 pre-created prices. `TOP_UP_OPTIONS` now uses `priceId` (not `productId`); checkout uses `price: priceId` directly. Currently on Stripe test mode — price IDs in `packages/stripe/src/topup.ts`.

### 2026-06-30 — AI usage logging, settings pages, multi-number training match, admin deals access

**AI usage logging (migrations 009, 010):**
- New `ai_usage_logs` table — one row per completed workflow (not per sub-call): one per deal underwritten, one per live call scored, one per training call scored. Columns: `company_id`, `app`, `entity_id`, `entity_type`, `input_tokens`, `output_tokens`, `cost_usd`, `model`.
- `lib/ai-usage.ts` — `logUsage()` helper using admin client, fire-and-forget (`void`) so it never blocks the response.
- `scorer.ts` — now returns `_usage: { inputTokens, outputTokens, costUsd, model }` on `ScoreResult`. All fallback/early-exit paths include `_usage` with zeros; callers guard with `if (inputTokens > 0)` before logging.
- Both ingest routes (`api/calls/ingest`, `api/training-coach/ingest`) call `logUsage` after insert. Underwriting route aggregates tokens across all 4 Claude steps and logs once at pipeline end.
- Billing Usage tab (`app/(platform)/billing/usage-tab.tsx`) rebuilt: fetches `ai_usage_logs`, shows 3-stat card grid (cost/runs/tokens), dedicated filter card with App + Period dropdowns + Custom Range date pickers, table with ExternalLink click-through per entity type (deal → `/underwriting/deals/[id]`, live_call → `/sales-coach/live-calls`, training_call → `/training-coach`).
- Migration `010_admin_deals_access.sql`: adds SELECT RLS policies on `deals` and `underwriting_reports` for admin (own company) and super_admin (all) — required so billing click-throughs to specific deals work for admins, not just the creating user. `live_calls` and `training_calls` already had permissive admin SELECT policies from migration 002.

**Training Coach: multiple phone numbers per user (migration 008):**
- New `user_phones` table (`id`, `user_id`, `phone` UNIQUE) with RLS scoped to own rows. Users register numbers at `/training-coach/my-numbers` (new page + sidebar nav item).
- Server actions: `addPhone(phone)` / `removePhone(id)` in `app/actions/training-coach/phones.ts`.
- Training ingest route updated: now does two-step lookup — `user_phones.phone = from` → `user_id`, then verifies `users.company_id + is_active`. Supports any number of registered phones per rep.

**Settings pages:**
- `/settings/company` (admin+ only) — edit company name and GHL sub-account ID; read-only stat cards for credits balance, member count, created date. Server action `updateCompany()` in `app/actions/admin/company.ts`.
- `/settings/account` (all roles) — edit full name and phone (with note about Training Coach matching); change password via `supabase.auth.updateUser`. Both pages linked from `PlatformShell` sidebar.

**Training Coach sidebar + dashboard fixes:**
- Added "Main Dashboard" link (Home icon) in Training Coach sidebar.
- Fixed Training Coach card on platform dashboard drifting below others — restructured card with middle `flex:1` div pinning the divider+CTA to the bottom.

**TypeScript fixes in scorer:**
- `costUSD` variable name mismatch in `_usage` return (was shorthand `costUsd`, variable is `costUSD`).
- `parsed` typed as `Record<string, any>` instead of `Record<string, unknown>` — eliminates ~15 assignment errors from JSON parse result access.

### 2026-06-30 — User management: invite flow, per-user app access, role-based UI
- Added `app_underwriting`, `app_sales_coach`, `app_training_coach` boolean columns to `users` table (migration `007_user_app_access.sql`). All existing admin/super_admin rows are back-filled to `true`; new users default to `false`.
- New `/admin/users` page (`app/(platform)/admin/users/`): table of company users with invite, edit (role/agent_type/app flags), and soft-deactivate (`is_active = false`) actions. Server actions in `app/actions/admin/users.ts`; enforced to `admin`/`super_admin` only. Current user row shows a "YOU" badge and suppresses edit/deactivate.
- Middleware rewired: `APP_GATE` now checks per-user flag columns instead of Stripe subscriptions. All three apps (`/underwriting`, `/sales-coach`, `/training-coach`) gated; `admin`/`super_admin` always pass; others redirect to `/dashboard` on failure. Stripe/subscription imports removed from middleware entirely.
- `/billing` and `/admin/users` server-redirect `user` role to `/dashboard`. `PlatformShell` also hides Users nav item, Billing nav item, and Company Settings sub-item from non-admins client-side (`accessRole` prop threaded through `dashboard/page.tsx`, `billing/page.tsx`, `users/page.tsx`).
- Invite email: configured Resend.com as custom SMTP in Supabase (bypasses 3/hr free-tier cap). Email template updated to OTP/token_hash flow: `{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite` — eliminates dependency on hash fragments (which middleware strips) and uses server-side OTP verification instead. `/auth/callback` extended to handle both PKCE (`code`) and OTP (`token_hash + type`) flows.
- Set-password page (`/auth/set-password`) reached after `/auth/confirm` verifies the invite OTP and redirects. Root cause of earlier redirect loop: Supabase Site URL had a literal `/**` wildcard which became the redirect path; fixed by setting Site URL to bare `http://localhost:3000`. Production: change to real domain, add it to Supabase Redirect URLs allowlist, set `NEXT_PUBLIC_APP_URL`.

### 2026-06-30 — Training Coach: real Assistable phone numbers (migration 006)
Replaced placeholder phone numbers on all 10 global AI agent personas with real Assistable-assigned numbers via migration `006_update_agent_phone_numbers.sql`. Run this if migrations 004/005 were already applied with dummy numbers.

### 2026-06-25 — Training Coach: globally-shared AI agents
`training_ai_agents.company_id` is now nullable (migration `005_training_ai_agents_global.sql`) — `NULL` means the agent is a shared roleplay persona visible to every company, not owned by one. Only `super_admin` can create/edit global agents (enforced in both RLS and `app/actions/training-coach/agents.ts`); regular admins are always scoped to their own company. The agents page query now does `company_id.eq.<mine>,company_id.is.null` for non-super-admins so they see their own company's agents plus all global ones. Seeded the first 10 global personas (Skeptical Homeowner, Burned Seller, etc.) with placeholder phone numbers pending real Assistable numbers.

### 2026-06-25 — Training Coach: brand colors fixed + AI Agents redesigned as cards
- Training Coach's sidebar/modal/badges initially shipped with a one-off yellow/red identity; corrected to the same blue/green palette Sales Coach uses (semantic score-quality/warning/error colors were already correct and left alone).
- `/training-coach/agents` redesigned from an admin-only table into a card grid any role can view (admin/super_admin keep add/delete) — each card shows agent name + description, with the phone number hidden behind a click-to-reveal toggle. Per client: these numbers are what reps dial to start a practice call with that agent.
- Added `description` and `external_agent_id` columns to `training_ai_agents` (migration `004_training_ai_agent_cards.sql`). `external_agent_id` is reference-only (Assistable's own agent ID) — not used by the ingest route's matching logic, which still resolves the AI agent purely by `to` phone number.

### 2026-06-25 — Training Coach split out as a standalone app
Training was previously a (non-functional — link 404'd) tab inside Sales Coach. Per client direction, split it into its own app so it can be unlocked/sold independently:
- New `/training-coach/*` app: calls-review page (reuses the live-calls table+modal pattern) and an `/training-coach/agents` page for registering AI bot numbers.
- New ingestion route `api/training-coach/ingest`, replacing the old `api/calls/training-ingest` (which matched by `agent_phone` only and was never actually wired to a live data source). New mapping: `location_id`→company, `from`→rep (gates scoring), `to`→AI agent (best-effort). See the Training Coach architecture section above for the full reasoning.
- New `training_ai_agents` table (migration `003_training_coach.sql`) — **needs to be run manually in Supabase before the new ingest route will work.**
- Removed the dead "Training" nav item from Sales Coach's sidebar; wired the platform taskbar + home dashboard's "AI Training Coach" entry from a `'soon'`/`href:'#'` placeholder to the real route.
- Access is intentionally left open (no subscription gate) for now — see the note under Auth + access gating above for why and what to do once the per-company billing model is finalized.
- Also fixed a latent bug while in this code: `components/ui/table.tsx`'s `TableCell` didn't declare `colSpan`, causing a type error anywhere a table needed an empty-state row spanning all columns (4 pre-existing occurrences elsewhere in the codebase, plus 2 new ones in this change) — added the prop to the shared component instead of working around it per call site.

### 2026-06-25 — Sales Coach filter overhaul (client spec compliance)
Reworked Analytics, Live Calls, and Leaderboard filters to match an exact client-provided spec with default values, not just filter existence:
- Duration: replaced bucket scheme (`short`/`medium`/`long`/`xlong`) with min-duration thresholds (1+/2+/5+/10+/15 min), defaulting to **2+ min** on Analytics and Live Calls.
- Added a Scorable filter (Scorable Only / All Calls), defaulting to **Scorable Only**.
- Role filter now defaults to the viewing user's own `agent_type` — required adding `agent_type` to the profile query in `analytics/page.tsx` and `live-calls/page.tsx` and passing it down as `currentUserAgentType`.
- Added a first-class **"Today"** period preset (Analytics, Leaderboard now default to it; Live Calls' raw date inputs default to today's date).
- Analytics' agent multi-select now defaults to `[currentUserId]` for `access_role: "user"`, matching the pattern Live Calls already used.
- Training-call ingestion (`api/calls/training-ingest`) was explicitly left untouched per client instruction — out of scope for this change.

### Earlier (undated, reconstructed from session history)
- Live-call ingestion matching switched from `agent_phone` to `agent_name` + `location_id` (GHL `companies.ghl_sub_account_id`) — phone matching was unreliable; `agent_phone` is now stored for reference only.
- Underwriting comps pipeline migrated from Axesso to RentCast (`lib/underwriting/rentcast.ts`); Axesso retained only for photo lookups and manual-comp address resolution. Added a Claude `synthesizeARV` step that reconciles RentCast's AVM against comp-based reasoning, since RentCast's "comps" are active/inactive listings rather than closed sales.
- Billing direction decided: **per-company**, not per-user — credits/wallet model (`companies.credits_balance`, `(platform)/billing` Wallet + Usage tabs) is the intended long-term model; the older per-user Stripe subscription gate in `middleware.ts` predates this decision and hasn't been removed yet (see the note under Auth + access gating above).
- Fixed a duplicate-shell bug where `sales-coach/admin/layout.tsx` and `super-admin/layout.tsx` re-rendered `Sidebar`/`ContentShell` on top of the parent layout's copy.
- Fixed `middleware.ts` blocking n8n's webhook POSTs to `/api/calls/ingest` by adding it (and `training-ingest`) to `PUBLIC_PATHS`.
