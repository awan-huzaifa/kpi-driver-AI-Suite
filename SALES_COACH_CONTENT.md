# AI Sales Coach — Website Content Brief

Everything the website Claude needs to write copy, build sections, and explain the product accurately.
Pull from this verbatim or paraphrase — all facts are real, pulled from the live codebase.

---

## What It Is (One-liner options)

- "Every sales call, scored. Instant coaching, every time."
- "AI-powered QA for your real estate sales team — 100-point scoring, evidence-backed feedback, zero manual review."
- "Stop guessing who needs coaching. Get per-call scores, category breakdowns, and three actionable improvements after every conversation."
- "The sales manager who listens to every call and gives feedback the same day."

---

## The Problem It Solves

Most real estate sales teams have no systematic way to evaluate call quality. Managers spot-check maybe 5% of calls. Reps get vague feedback weeks after the conversation happened. Bad habits compound. Good habits go unrecognized.

The AI Sales Coach changes that:
- Every call gets scored automatically — no manual listening required
- Feedback is specific, evidence-based, and role-appropriate
- Reps see exactly what they did well and what to fix
- Managers get flagged only when a call actually warrants review
- Performance trends are visible across the whole team in real time

---

## The Two Roles It Scores

The platform has two distinct sales specializations, each with its own AI scoring rubric:

### Follow-Up Specialist (FUS)
Responsible for re-engaging leads in a CRM pipeline. Their job is not to close — it's to qualify, uncover seller motivation, and book an appointment for the acquisition specialist. Scoring is calibrated to this role: a FUS who doesn't close is not penalized; a FUS who tries to close is.

### Acquisition Specialist (ACQ)
Closes deals directly with motivated sellers. They handle discovery, offer strategy, objection handling, and contract execution. Scoring rewards decision quality and execution — not just outcomes.

---

## How It Works — The Pipeline (Step by Step)

Every call that comes through GHL (GoHighLevel) routes through an automated pipeline:

### Step 1 — Webhook Ingestion
The call is delivered to the platform via a `POST /api/calls/ingest` webhook, triggered by n8n after a call is recorded and transcribed in GHL.

The payload includes:
- `agent_name` — rep's full name (matched against the users database)
- `location_id` — GHL sub-account ID (matched against companies)
- `direction` — inbound or outbound
- `duration_sec` — call length in seconds
- `transcript` — full call transcript
- `stage` — the CRM stage at time of call (e.g. "New Lead", "Appointment Set")
- `lead_id`, `call_id`, `call_date`, `lead_source`, `known_outcome` (optional context)
- `recording_url`, `crm_link` (optional links back to GHL)

Authentication: `x-webhook-secret` header (timing-safe comparison against `WEBHOOK_SECRET` env var). This route is public-facing for n8n but unauthenticated requests are rejected immediately.

### Step 2 — Company + Rep Matching
The platform:
1. Looks up the company using `ghl_sub_account_id = location_id`
2. Looks up the rep using a case-insensitive name match: `ilike(full_name, agent_name)` scoped to that company, `is_active = true`

If either lookup fails, the webhook returns a 404 — the call is not scored and no AI tokens are spent. This is the cost gate: unrecognized reps never trigger a scoring call.

### Step 3 — Wallet Balance Check
Before calling Claude, the system checks that the company's wallet balance is > $0. If the balance is insufficient, the call returns 402 and is not scored.

### Step 4 — Claude Scoring Call 🤖
**Model: Claude Sonnet (`claude-sonnet-4-6`) — 1 call per scored call**

Claude receives:
- The full call transcript
- The rep's role (`follow_up_specialist` or `acquisition_specialist`)
- The CRM stage at time of call
- The full scoring rubric for that role (100-point scale)
- All optional context (rep name, lead ID, call date, lead source, known outcome)
- A flag if this is a training/role-play call vs. a live call with a real seller

Claude returns a structured JSON evaluation including:
- Overall score (0–100)
- Score band label
- Per-category scores
- Penalties and bonuses with evidence quotes
- Strengths
- Missed opportunities
- 3 coaching actions (one behavioral, one tactical, one strategic)
- Full score reasoning narrative
- Evidence snippets (exact quotes + why they matter)
- Confidence level (0–1)
- Manager review flag

The system prompt is cached using Anthropic's prompt caching (ephemeral) — repeated calls within the cache window only pay $0.30/1M tokens for the cached system prompt rather than the full $3.00/1M input rate, significantly reducing cost at volume.

### Step 5 — Save to Database
The full evaluation is saved to the `live_calls` table in Supabase, including:
- All scoring fields
- The full `evaluation` JSONB object (rubric version, category scores, penalties/bonuses, coaching actions, evidence, confidence, etc.)
- Call metadata (direction, duration, contact, recording URL, CRM link)

### Step 6 — Billing
AI token usage is logged to `ai_usage_logs`. The company wallet is deducted based on actual tokens used × per-company charged rate (configurable per company and globally via `billing_config`). If the wallet drops below a threshold, an auto-topup can be triggered from the company's saved payment method.

---

## Output: What You Get Per Call

After every scored call, the platform has:

| Field | Content |
|-------|---------|
| Overall Score | 0–100 integer |
| Score Band | Elite / Strong / Workable / Weak / Needs Coaching |
| Category Scores | Points earned per rubric category (see rubrics below) |
| Call Type | Classified by Claude (e.g. "Initial Contact", "Follow-Up", "Negotiation") |
| Call Result | 2–3 word summary of what actually happened (e.g. "Appointment Set", "Not Interested", "Callback Scheduled") |
| Opportunity Level | Low / Medium / High — Claude's read on the seller's motivation |
| Penalties | What docked points + quote from transcript as evidence |
| Bonuses | What earned extra points + evidence |
| Strengths | What the rep did well |
| Missed Opportunities | What the rep could have done differently |
| Coaching Actions | 3 specific actions: 1 behavioral, 1 tactical, 1 strategic |
| Score Reasoning | Claude's written explanation of the score |
| Evidence Snippets | Exact transcript quotes + why each one mattered |
| Confidence | 0–1 score reflecting transcript clarity and data quality |
| Manager Review Flag | True when the call needs human escalation |

---

## Scoring Rubrics

### FUS Rubric — Follow-Up Specialist (100 points)

| Category | Points | What It Measures |
|----------|--------|-----------------|
| Rapport & Tone | 15 | Warmth, call-back context, natural conversation flow |
| Qualification Completeness | 25 | Timeline, motivation, property condition, decision-maker status |
| Motivation Discovery | 15 | Uncovering the why — financial pressure, life event, urgency |
| Conversation Control | 10 | Leading the conversation, keeping focus, avoiding seller tangents |
| Objection Handling | 15 | Responding to hesitation without giving up or conceding too fast |
| Scheduling / Next Step | 15 | Clear next action — appointment booked, callback set, or logical reason to nurture |
| Compliance & Professionalism | 5 | No prohibited statements, professional tone throughout |

**Penalties:**
- Gave offer without authorization: −10 points (FUS should not be quoting offers)
- Missed a clear scheduling cue: −10 points

### ACQ Rubric — Acquisition Specialist (100 points)

| Category | Points | What It Measures |
|----------|--------|-----------------|
| Rapport / Trust / Authority | 5 | Credibility established, seller comfortable |
| Strategic Discovery | 20 | Property condition, timeline, financial situation, liens/encumbrances |
| Motivation / Pain Extraction | 20 | Root cause of why they're selling — emotional and financial |
| Deal Control | 10 | Rep drives the conversation, seller doesn't dominate or deflect |
| Offer Strategy | 15 | Offer timing, anchoring, framing — logical and defensible |
| Objection Handling | 10 | Addresses objections with data and empathy, doesn't fold |
| Deal Advancement Decision | 10 | Correct read on where the deal stands, appropriate next step chosen |
| Closing Execution | 15 | Contract conversation handled correctly when the time was right |

**Penalties:**
- No offer made when the situation called for it: −5 points
- Lost control of the call: −5 points

### Score Bands

| Band | Score Range | Meaning |
|------|------------|---------|
| Elite | 90–100 | Exemplary execution — use as a training benchmark |
| Strong | 75–89 | Solid performance with minor gaps |
| Workable | 60–74 | Functional but needs improvement in specific areas |
| Weak | 45–59 | Multiple issues present — coaching needed |
| Needs Coaching | 0–44 | Significant gaps — may warrant immediate intervention |

---

## Manager Review Flag

Claude automatically sets `manager_review_needed = true` when any of the following are detected:

- Score below 55
- Compliance issue detected in the transcript
- Hostile or inappropriate rep behavior
- Urgent foreclosure / extreme seller distress
- Claude's own confidence in its scoring is below 0.6 (ambiguous or unclear transcript)
- Transcript ambiguity that materially affects the score

Managers only see the calls that actually need their attention — not a firehose of every recording.

---

## Training / Role-Play Mode

The Sales Coach also scores AI role-play practice calls from Assistable AI (routed through a separate Training Coach ingest). When scoring a practice call, Claude is explicitly told:

- This is a role-play call, not a live call with a real seller
- The "seller" responses came from an AI playing a character
- Score the rep's technique and decision-making normally, but understand the other side of the conversation

The rubric, scoring schema, and output format are identical to live calls. Practice calls are written to the `training_calls` table rather than `live_calls`. See the AI Training Coach product for details.

---

## Key Features

### Automatic CRM-Native Integration
No separate recording or upload flow. The platform receives calls directly from GHL via n8n webhook. As long as a rep's name is registered and their GHL sub-account is connected, every call gets scored automatically.

### Role-Aware Scoring
A FUS and an ACQ on the same call would receive different scores against different rubrics. The system never applies an ACQ rubric to a setter — it knows what each role's job actually is and scores accordingly.

### Opportunity-Level Context
Claude classifies each call as low, medium, or high opportunity based on the seller's stated motivation and urgency. This helps managers prioritize follow-up: a weak score on a high-opportunity call is more urgent than a weak score on a cold list call.

### 3 Actionable Coaching Moments Per Call
Every evaluation returns exactly 3 coaching actions — one behavioral (how the rep shows up), one tactical (specific in-call technique), one strategic (how to think about calls like this). Not a generic feedback wall — three things to work on.

### Evidence-Based Feedback
Every strength, penalty, and coaching action is tied to an exact transcript quote. Reps can see the specific moment they went wrong, not a vague summary.

### Non-Scorable Calls Still Saved
Calls from reps with roles that don't have rubrics (e.g. transaction coordinators) are still saved to the database — they just don't get an AI score. Nothing is dropped.

---

## Analytics & Reporting

Three views available across the platform:

### Live Calls
Full table of every scored call with filters for:
- Date range (Today, Last 7 Days, Last 30 Days, Custom)
- Direction (Inbound / Outbound)
- Duration threshold (2+ min / 5+ min / 10+ min / 15+ min — filters out hang-ups and dead air)
- Role (FUS / ACQ)
- Scorable only / All calls
- Lead source
- Agent (multi-select)

Each row expands into a full evaluation modal: score, all category scores, penalties, bonuses, coaching actions, evidence snippets, and a direct link to the CRM record and recording.

### Analytics
Team-level performance view with:
- Average score over time
- Score distribution by band
- Top performers and lowest performers
- Category-level averages across the team
- Filters for all the same dimensions as Live Calls

### Leaderboard
Ranked view of reps by average score within a time period. Filterable by role, period, and direction. Shows score, call count, and band distribution per rep.

---

## Access Control

| Role | What They See |
|------|--------------|
| super_admin | All companies, all calls, all reps across the platform |
| admin | All calls within their own company |
| user | Only their own calls |

KPI Dashboard and Sales Coach are restricted to `admin` and `super_admin` roles. Regular users see the platform but not the KPI analytics section.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) — server page.tsx + 'use client' client components |
| Language | TypeScript — fully typed scoring schema from ingest to UI |
| AI Model | Claude Sonnet (`claude-sonnet-4-6`) via Anthropic API — 1 call per scored call |
| Prompt Caching | Anthropic ephemeral cache on system prompt — dramatically reduces cost at volume |
| Integration | GoHighLevel (GHL) → n8n → `/api/calls/ingest` webhook |
| Authentication | `x-webhook-secret` header (timing-safe) — no Supabase session for webhooks |
| Database | Supabase Postgres — `live_calls` table with full `evaluation` JSONB |
| Auth | Supabase Auth — session-based, role-scoped data access |
| Billing | Per-company wallet (credits); AI cost tracked per call; per-company markup configurable |
| Hosting | Vercel |

---

## APIs Used

### Anthropic (Claude)
- **Endpoint:** Anthropic Messages API
- **Model:** `claude-sonnet-4-6`
- **Calls per scored call:** 1
- **Capabilities used:** structured JSON output, rubric-based evaluation, transcript analysis
- **Prompt caching:** system prompt cached as `ephemeral` — cache reads cost $0.30/1M tokens vs $3.00/1M for uncached input
- **Key:** `ANTHROPIC_API_KEY_SALES_COACH` (separate from Underwriter and Training Coach keys)

---

## Webhook Integration Spec (for GHL/n8n setup)

**Endpoint:** `POST /api/calls/ingest`

**Authentication header:** `x-webhook-secret: <your-webhook-secret>`

**Required fields:**
```json
{
  "agent_name":   "Jane Smith",
  "location_id":  "your-ghl-sub-account-id",
  "direction":    "outbound",
  "duration_sec": 347,
  "transcript":   "Agent: Hi, is this John?..."
}
```

**Optional fields:**
```json
{
  "agent_phone":    "+15559991234",
  "contact_name":   "John Seller",
  "contact_phone":  "+15558887654",
  "stage":          "New Lead",
  "call_id":        "ghl-call-id-abc123",
  "lead_id":        "ghl-contact-id-xyz456",
  "call_date":      "2026-09-17T14:30:00Z",
  "lead_source":    "Facebook Ads",
  "known_outcome":  "Appointment Set",
  "recording_url":  "https://recordings.ghl.com/...",
  "crm_link":       "https://app.gohighlevel.com/contacts/..."
}
```

**Response on success:**
```json
{
  "success":               true,
  "call_id":               "uuid-of-saved-call",
  "scorable":              true,
  "score":                 74,
  "score_band":            "Workable",
  "manager_review_needed": false
}
```

---

## Accuracy & Methodology Notes

- **Scoring is role-calibrated, not outcome-based.** A FUS who qualifies a seller and books an appointment scores high even if the deal never closes. An ACQ who pressures a seller into an appointment before understanding their motivation scores low even if it results in a contract. Claude evaluates decision quality and execution quality — not results.
- **Evidence is required for penalties.** Claude cannot dock points for something it cannot quote from the transcript. If it suspects a problem but can't find the quote, it lowers confidence instead of applying a penalty.
- **Confidence is model-generated.** Claude assigns 0–1 based on transcript quality, conversation clarity, and ambiguity in scoring. Calls below 0.6 confidence automatically flag for manager review.
- **Non-English or garbled transcripts are handled gracefully.** If Claude cannot score a call meaningfully (poor transcription quality, extremely short call, no actual conversation), it sets `scorable: false` with a reason and saves the record without a score — no partial or invented scores.

---

## Tagline Options

- "Every call, coached. Instantly."
- "AI QA for your real estate sales team — at scale."
- "100-point call scoring. Evidence-backed feedback. No manual listening required."
- "Your best sales manager — on every call."
- "Stop reviewing 5% of calls. Score 100% automatically."

---

## Stats / Social Proof Angles (use actual numbers once available)

- Calls scored per month
- Average time from call end to score delivered (target: under 60 seconds)
- "1 Claude call, 100-point rubric, 3 coaching actions — before the rep's next call"
- Manager review rate (% of calls flagged — shows the signal-to-noise ratio)
- Score improvement over time (reps who receive consistent coaching trend upward)
