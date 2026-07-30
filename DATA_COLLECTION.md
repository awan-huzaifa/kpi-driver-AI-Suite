# KPI Driver — Data Collection Reference

This document lists every category of data the platform collects, stores, and processes, organized by app. Intended as a reference for drafting Terms & Conditions and Privacy Policy.

---

## Platform (All Apps — Applies To Every User)

### Account & Identity
| Data | Where Stored | Purpose |
|------|-------------|---------|
| Email address | `users.email`, Supabase Auth | Login, invite emails, Stripe billing |
| Full name | `users.full_name` | Display, call matching |
| Phone number | `users.phone` | Account reference (unique per user) |
| Profile picture / avatar | Supabase Storage (`avatars` bucket) | UI display |
| Role (`super_admin / admin / user`) | `users.access_role` | Access control |
| Agent type (`fus / acq / tc / cc / none`) | `users.agent_type` | Scoring rubric selection |
| Active status | `users.is_active` | Soft-deactivation |

### Company / Organization
| Data | Where Stored | Purpose |
|------|-------------|---------|
| Company name | `companies.name` | Display, Stripe descriptions |
| GHL Sub-Account ID | `companies.ghl_sub_account_id` | Matching inbound webhooks to the right company |
| Company logo | Supabase Storage | Branding display |

### Billing & Payments (Stripe)
| Data | Where Stored | Purpose |
|------|-------------|---------|
| Stripe Customer ID | `companies.stripe_customer_id` | Payment method storage |
| Saved payment methods (card last 4, brand, expiry) | Stripe — never stored in our DB | One-click top-ups |
| Payment intent ID | `company_wallet_transactions.stripe_payment_intent_id` | Idempotency, refund reference |
| Wallet balance | `companies.wallet_balance` | Running AI cost deductions |
| Transaction history (top-ups + deductions, amount, description, app, timestamp) | `company_wallet_transactions` | Billing audit trail |

### AI Usage Logs
| Data | Where Stored | Purpose |
|------|-------------|---------|
| App name, entity ID, entity type | `ai_usage_logs` | Per-run cost tracking |
| Input tokens, output tokens, cost (USD), model name | `ai_usage_logs` | Billing calculation |
| Timestamp | `ai_usage_logs.created_at` | Usage history |

### Authentication
- Supabase Auth handles password hashing, session tokens, and OAuth tokens. Passwords are never stored in plain text and are never accessible by us.
- Google OAuth sign-in: we receive the user's Google email and name only; no other Google account data is accessed.
- Invite emails are sent via Resend (transactional email). The recipient email address is passed to Resend for delivery only.

---

## AI Sales Coach (`/sales-coach`)

### Live Call Records
| Data | Where Stored | Notes |
|------|-------------|-------|
| Contact name | `live_calls.contact_name` | The person the rep spoke with |
| Contact phone number | `live_calls.contact_phone` | The lead/contact's number |
| Agent phone number | `live_calls.agent_phone` | Stored for reference only |
| Call direction (inbound / outbound) | `live_calls.direction` | |
| Call duration (seconds) | `live_calls.duration_sec` | |
| Call stage | `live_calls.call_stage` | e.g. opener, close |
| Full call transcript | `live_calls.transcript` | Sent to Anthropic Claude for AI scoring |
| Recording URL | `live_calls.recording_url` | Link to hosted audio file (not stored by us) |
| CRM link | `live_calls.crm_link` | Link back to GHL contact record |
| Scorable flag | `live_calls.scorable` | Whether the call met minimum scoring criteria |
| Score (0–100) | `live_calls.score` | AI-generated |
| Call result | `live_calls.call_result` | e.g. appointment set, no answer |
| AI evaluation (penalties, bonuses, category scores, coaching actions) | `live_calls.evaluation` (JSONB) | Output of Claude scoring |

### Third-Party Data Flow
- Call data arrives via **n8n webhook** from **GoHighLevel (GHL)**. The webhook payload contains transcript, recording URL, agent name, contact info, and location ID.
- The transcript is sent to **Anthropic Claude** (via `ANTHROPIC_API_KEY_SALES_COACH`) for scoring. Anthropic's data handling applies to this content.
- We do **not** store the audio recording — only the URL pointing to GHL's hosted file.

---

## AI Training Coach (`/training-coach`)

### Training Call Records
| Data | Where Stored | Notes |
|------|-------------|-------|
| Full call transcript | `training_calls.transcript` | Sent to Anthropic Claude for scoring |
| Recording URL | `training_calls.recording_url` | Link only |
| Duration, direction, call stage | `training_calls.*` | |
| Score, evaluation (same shape as live calls) | `training_calls.score`, `.evaluation` | AI-generated |
| Call result, scorable flag | `training_calls.*` | |
| External call ID | `training_calls.external_call_id` | Assistable AI's call ID, used for dedup |
| Call summary | `training_calls.call_summary` | AI-generated summary |
| AI agent ID | `training_calls.ai_agent_id` | Which Assistable bot the rep practiced with |

### Rep Phone Numbers
| Data | Where Stored | Notes |
|------|-------------|-------|
| Rep's registered phone number(s) | `user_phones.phone` | Used to match inbound Assistable webhooks to a user. Reps self-register. |

### AI Agent Registry
| Data | Where Stored | Notes |
|------|-------------|-------|
| Bot phone number | `training_ai_agents.phone_number` | Real telecom number assigned by Assistable |
| Bot name, description | `training_ai_agents.agent_name`, `.description` | Display only |
| External agent ID | `training_ai_agents.external_agent_id` | Assistable's own agent ID, reference only |

### Third-Party Data Flow
- Training call data arrives via **Assistable AI** post-call webhook (direct, no n8n).
- Transcript is sent to **Anthropic Claude** for scoring (same pipeline as live calls).

---

## AI Deal Underwriter (`/underwriting`)

### Deal & Property Data
| Data | Where Stored | Notes |
|------|-------------|-------|
| Property address | `deals.address`, `underwriting_reports.address` | The subject property being underwritten |
| Beds, baths, sqft, year built | `underwriting_reports.*` | |
| Property condition assessment | `underwriting_reports.condition` | AI-generated (Claude) |
| Full property data blob | `underwriting_reports.property_data` (JSONB) | Raw data from RentCast |
| Comparable properties (comps) | `underwriting_reports.comps` (JSONB) | From RentCast; includes addresses, sale prices, sqft |
| ARV low/high, max offer low/high, repair costs, investor profit | `underwriting_reports.*` | Calculated by our engine |
| AI assessment (condition rating, comp validation, ARV synthesis) | `underwriting_reports.ai_assessment` (JSONB) | Claude output |
| Recommendation (pursue / negotiate / pass), confidence, summary | `underwriting_reports.*` | Claude output |
| Flags | `underwriting_reports.flags` (text[]) | Risk flags raised by AI |
| Deal status | `deals.status` | pending / completed / failed |

### Third-Party Data Flow
- **RentCast API**: property data and comparable listings are fetched by address. RentCast's terms apply to that data.
- **Axesso API**: used for property photos and address-only manual comp resolution.
- **Anthropic Claude** (`ANTHROPIC_API_KEY_DEAL_UNDERWRITER`): property descriptions and comp lists are sent for AI assessment, ARV synthesis, and report generation.
- PDF reports are generated server-side using `@react-pdf/renderer` and served directly — not stored on a third-party service.

---

## Note Taker (`/note-taker`)

### Call Note Records
| Data | Where Stored | Notes |
|------|-------------|-------|
| To/from phone numbers | `note_taker_calls.to_number`, `.from_number` | Numbers involved in the call |
| Call direction | `note_taker_calls.call_direction` | |
| AI-generated call summary | `note_taker_calls.ai_summary` | Claude output |
| Plain transcript summary | `note_taker_calls.normal_summary` | Non-AI summary from n8n |
| Lead source | `note_taker_calls.*` | Where the lead originated |
| Contact phone | `note_taker_calls.*` | |
| CRM link | `note_taker_calls.*` | Link to GHL contact |
| Agent name | `note_taker_calls.*` | Who handled the call |
| Custom fields | `note_taker_calls.custom_fields` (JSONB) | Configurable per company |
| AI token usage + cost | `note_taker_calls.*` | Per-call billing |

### Third-Party Data Flow
- Call data arrives via **n8n webhook** from GHL.
- Transcripts/summaries are processed by **Anthropic Claude**.

---

## Data Enrichment (`/data-enrichment`)

### Enrichment Records
| Data | Where Stored | Notes |
|------|-------------|-------|
| Dynamic enriched fields | `data_enrichment_logs.fields` (JSONB array of `{key, value}`) | Whatever CRM fields were enriched — varies by workflow |
| Contact name | `data_enrichment_logs.*` | |
| Contact phone | `data_enrichment_logs.*` | |
| CRM link | `data_enrichment_logs.*` | Link to GHL contact record |
| External ID | `data_enrichment_logs.external_id` | n8n idempotency key |
| AI token usage + cost | `data_enrichment_logs.*` | Per-run billing |

### Third-Party Data Flow
- Records arrive via **n8n webhook** from GHL.
- Field enrichment is performed by **Anthropic Claude**.
- The specific data enriched depends on each company's configured GHL workflow.

---

## Skip Tracing (`/skip-tracing`)

### Skip Trace Records

**All flows store:**
| Data | Where Stored |
|------|-------------|
| GHL Contact ID | `skip_tracing_logs.contact_id` |
| Flow type (apn / dnc / skiptrace) | `skip_tracing_logs.flow_type` |
| Hit flag (found or not) | `skip_tracing_logs.hit` |
| Credits used, cost (USD) | `skip_tracing_logs.*` |
| Full Tracerfy API response | `skip_tracing_logs.payload` (JSONB) |

**APN (Parcel) flow additionally stores:**
- Parcel ID, county, address, city, state, zip

**DNC (Do Not Call) flow additionally stores:**
- Phone number, national/state DNC flags, DMA flag, litigator flag, phone type (mobile/landline/VOIP)

**Skiptrace flow additionally stores:**
- Address, city, state, zip, find-owner flag
- Person records from Tracerfy payload: names, phone numbers, emails of identified persons

### Third-Party Data Flow
- Lookups are performed via **Tracerfy API** (credits model — not AI tokens).
- Requests arrive from **n8n** webhooks tied to GHL contacts.
- Skip tracing returns personal information (names, phones, emails) about property owners and contacts — this is the most sensitive category of data in the platform.

---

## Summary: Third-Party Services Used

| Service | Purpose | Data Sent To Them |
|---------|---------|-------------------|
| **Supabase** | Auth, database, file storage | All user/company/call data |
| **Stripe** | Payments | Email, payment card details (Stripe handles card data directly) |
| **Anthropic Claude** | AI scoring, underwriting, note summaries, enrichment | Call transcripts, property addresses, CRM field data |
| **RentCast** | Property comps | Property address |
| **Axesso** | Property photos, address resolution | Property address |
| **Tracerfy** | Skip tracing, DNC, APN lookups | Phone numbers, addresses, parcel IDs |
| **Assistable AI** | Training call delivery | None — they send data to us via webhook |
| **GoHighLevel (GHL)** | CRM source | None — GHL sends data to us via n8n webhooks |
| **n8n** | Webhook automation / routing | Call metadata in transit |
| **Resend** | Invite emails | Recipient email address |
| **Google** | OAuth sign-in | Email, name (read-only, one-time at sign-in) |

---

## Data Retention Notes

- Call records (live, training, note taker) are retained indefinitely unless a company is deleted.
- Deals and underwriting reports are retained indefinitely.
- Skip tracing logs are retained indefinitely.
- Wallet transactions are retained as a financial audit trail.
- Users soft-deleted via `is_active = false` — their data remains associated with the company.
- No automatic data expiry or purge is currently implemented.

---

## Sensitive Data Highlights (For Privacy Policy)

1. **Call transcripts** — contain conversations between sales reps and real estate sellers/buyers. Sent to Anthropic for scoring.
2. **Contact phone numbers** — real estate leads' personal numbers.
3. **Skip trace person data** — names, phones, emails of property owners identified via Tracerfy. Highest sensitivity.
4. **DNC flags** — indicate whether a phone number is on a Do Not Call registry.
5. **Payment card data** — handled exclusively by Stripe; KPI Driver never sees or stores raw card numbers.
6. **Rep phone numbers** — reps register their own mobile numbers for Training Coach matching.
