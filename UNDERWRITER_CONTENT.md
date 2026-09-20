# AI Deal Underwriter — Website Content Brief

Everything the website Claude needs to write copy, build sections, and explain the product accurately.
Pull from this verbatim or paraphrase — all facts are real, pulled from the live codebase.

---

## What It Is (One-liner options)

- "Underwrite any deal in minutes — live comps, AI condition scoring, and a full investment report, automatically."
- "Type an address. Get a complete investment analysis with ARV, max offer, and a buy/pass recommendation."
- "Stop spending hours on deal analysis. Our AI underwrites properties in minutes, not days."

---

## The Problem It Solves

Real estate investors and wholesalers waste hours per deal manually:
- Pulling comps from Zillow or MLS
- Estimating repair costs by gut feel
- Calculating ARV and max offer on a spreadsheet
- Writing up deal summaries for buyers or partners

One missed comp or wrong repair estimate costs thousands. The AI Deal Underwriter eliminates the guesswork and compresses hours of work into a few minutes.

---

## How It Works — The Pipeline (Step by Step)

Every time a user submits an address, the platform runs a 15-step automated pipeline:

### Step 1 — Property Data Pull
The system hits the **Axesso API** (a Zillow data provider) to pull the full property record:
beds, baths, sqft, year built, lot size, property type, construction materials, heating/cooling systems, roof type, HOA status, price history, days on market, foreclosure flags (bank-owned, pre-foreclosure, FSBO), Zestimate, last sale price, and up to 30 property photos.

### Step 2 — Live Comp Pull (RentCast AVM)
The system calls the **RentCast API** (`GET /v1/avm/value`) to pull the AVM estimate and up to 5 nearby comparable properties. RentCast returns:
- An automated valuation (`price`, `priceRangeLow`, `priceRangeHigh`)
- Each comp's address, property type, beds/baths/sqft, list price, days on market, listing status, and a similarity correlation score (0–1) vs. the subject

### Step 3 — Photo Fetch
Property listing photos are pulled from Axesso and converted to base64 for direct injection into Claude's vision model.

### Step 4 — Manual Comp Resolution (if applicable)
If the user added manual comps (address-only entries), the system resolves them by hitting Axesso's `searchProperty` endpoint to fill in sqft, sale price, beds/baths, and photos automatically. No manual data entry needed beyond the address.

### Step 5 — Claude Call 1: Property Condition Assessment 🤖
**Model: Claude Opus (claude-opus-4-7) — with vision**

Claude receives:
- All property photos (uploaded or pulled from Axesso/Zillow)
- The user-selected condition grade (Excellent / Good / Fair / Poor)
- Any agent notes about the property

Claude returns:
- A condition score (1–10)
- A written summary
- Line-item breakdown by category (roof, HVAC, foundation, electrical, cosmetic, etc.)

This is a multimodal AI call — Claude actually looks at the photos.

### Step 6 — Repair Cost Calculation
Three modes, calculated deterministically (no AI):

| Mode | How it works |
|------|-------------|
| **Known Cost** | User provides an exact dollar figure. Used as-is. |
| **Scope Known** | User itemises repairs. System sums the line items. |
| **Standard** | Condition grade × sqft × market multiplier. Rates: Excellent $0–15/sqft, Good $25–35/sqft, Fair $40–50/sqft, Poor $55–65/sqft. Plus any add-on items (roof, HVAC, etc.) |

Feature adjustments added to ARV (not repairs):
- Concrete/brick/stone construction → +$17,500
- Private pool → +$30,000
- Garage → +$15,000
- Off-street parking → +$10,000

### Step 7 — Claude Call 2: Comp Validation & Categorization 🤖
**Model: Claude Opus**

Claude receives all pulled comps and the subject property details. It:
- Rejects comps that are too dissimilar (wrong size, wrong location, outlier pricing)
- Categorizes each valid comp as `arv` (post-renovation), `turnkey` (move-in ready), or `as_is` (distressed)
- Writes analyst notes on the comp pool quality
- Only `arv`-categorized comps feed the ARV calculation

### Step 8 — Claude Call 3: ARV Synthesis 🤖
**Model: Claude Opus**

This is the most sophisticated step. Claude reconciles two independent signals:
1. **RentCast's AVM** — a statistical model estimate with a confidence range
2. **Validated ARV comps** — the properties Claude flagged as true post-renovation comparables

Because RentCast's comps are active/inactive *listings* (not confirmed closed sales), Claude reasons about the weight to give each source and produces:
- A final ARV
- An ARV low and high range
- Written reasoning explaining how the two signals were weighted

Fallback: if RentCast is unavailable, the system falls back to the Zestimate from Axesso.

### Step 9 — Max Offer Calculation
Deterministic math, no AI:

```
Net Sales Price   = ARV × 0.92
Closing Costs     = ARV × 0.02
Realtor Fees      = ARV × 0.06
Investor Profit   = Net Sales Price × investor profit % (default 15%)
Assignment Fee    = default $22,500

Max Offer Low     = Net Sales Price − Repairs High − Investor Profit − Assignment Fee
Max Offer High    = Net Sales Price − Repairs Low  − Investor Profit − Assignment Fee
```

Users can customise investor profit % and assignment fee per deal.

### Step 10 — Claude Call 4: Full Underwriting Report 🤖
**Model: Claude Opus**

Claude receives everything — property data, condition assessment, validated comps, ARV, repairs, financials, flags — and writes the full investment memo:

- **Executive Summary** — 2–3 paragraph deal overview
- **Property Narrative** — condition, features, market position
- **Market Narrative** — comp analysis, pricing trends, ARV reasoning
- **Red Flags** — risks that could hurt the deal (title issues, major road proximity, older permits, tenant-occupied, distressed comps nearby)
- **Green Flags** — factors that strengthen the deal
- **Recommendation** — `pursue`, `negotiate`, or `pass`
- **Confidence Score** — 1–10, reflecting data quality and comp availability

### Step 11 — Save + Billing
- Full report saved to Supabase (`deals` + `underwriting_reports` tables)
- AI token usage logged (`ai_usage_logs` table) — input tokens, output tokens, cost in USD across all 4 Claude calls
- Usage cost × company markup multiplier deducted from company wallet balance

---

## Output: What You Get

After ~60–90 seconds, the user receives a full investment report including:

| Section | Content |
|---------|---------|
| Property Overview | Beds/baths/sqft, year built, property type, lot size, all features |
| Condition Assessment | AI score + line-item breakdown by system |
| Repair Estimate | Low–high range, per-sqft rate, itemised extras |
| Comparable Properties | Up to 5 comps with photos, price/sqft, distance, categorization |
| ARV | Final value + low/high range + methodology (AI synthesis or Zestimate fallback) |
| Max Offer | Full offer stack: Net Sales Price, Closing Costs, Realtor Fees, Investor Profit, Assignment Fee, Max Offer Low/High |
| Deal Memo | Executive summary, property narrative, market narrative |
| Red & Green Flags | AI-identified risks and strengths |
| Recommendation | Pursue / Negotiate / Pass |
| Confidence Score | 1–10 |

**PDF Export** — the full report exports as a branded PDF via `@react-pdf/renderer`, ready to send to sellers, buyers, or partners.

---

## Key Features

### Re-run with Modifications
Every deal can be re-run without pulling fresh data:
- Exclude comps that don't apply
- Add manual comps (enter an address and the system fills in the details automatically)
- Override the ARV (fixed dollar amount or per-sqft multiplier)
- Change repair mode, condition grade, or repair cost
- Re-runs use stored comps and photos — no extra API calls

### Three Repair Modes
1. **Known Cost** — you know the repair number, plug it straight in
2. **Scope Known** — you have a list of repairs, enter them as line items
3. **Standard** — AI-assisted estimate based on condition grade and sqft

### Market Multiplier
A per-market adjustment factor applied to repair cost calculations, so the same deal in Phoenix prices differently than one in Detroit.

### Flags System
The pipeline automatically raises flags throughout processing:
- `sqft_range_expanded` — comps found only by loosening sqft filter
- `distance_expanded` — comps required a wider search radius
- `comp_older_6_months` — aged listings in the pool
- `tenant_occupied`, `no_permits`, `major_road_comp`, `cross_arterial_comp` — risk signals

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) — server-side API route handles the full pipeline |
| Language | TypeScript — fully typed pipeline from request to report |
| AI Model | Claude Opus (claude-opus-4-7) via Anthropic API — 4 calls per deal, multimodal vision on Call 1 |
| Property Data | Axesso API (Zillow data provider) — property details, photos, price history, Zestimate |
| Comparable Data | RentCast API — AVM valuation + nearby comparable properties with similarity scores |
| Database | Supabase Postgres — deals, reports, AI usage logs, per-company wallet |
| Auth | Supabase Auth — session-based, per-company access control |
| Billing | Per-company wallet (credits); AI cost tracked per deal; company markup multiplier applied |
| PDF Export | @react-pdf/renderer — branded PDF generation server-side |
| Hosting | Vercel |

---

## APIs Used

### Anthropic (Claude)
- **Endpoint:** Anthropic Messages API
- **Model:** `claude-opus-4-7`
- **Calls per deal:** 4 (condition assessment, comp validation, ARV synthesis, report generation)
- **Capabilities used:** text reasoning + vision (base64 image injection for property photos)
- **Key:** `ANTHROPIC_API_KEY_DEAL_UNDERWRITER` (separate from other platform keys)

### RentCast
- **Endpoint:** `GET /v1/avm/value?address=...&compCount=5`
- **What it returns:** AVM price estimate with confidence range + up to 5 comparable properties with correlation scores
- **Used for:** primary comp source and AVM baseline that feeds Claude's ARV synthesis

### Axesso (Zillow Data)
- **What it returns:** Full property record — all specs, price history, foreclosure flags, Zestimate, listing photos
- **Used for:** subject property data + photo pull + address-only manual comp resolution
- **Key note:** Axesso is a Zillow data reseller; it provides the underlying property intelligence

---

## Accuracy & Methodology Notes (for website transparency section)

- **ARV is not a Zestimate.** The system uses RentCast's AVM as one signal, then has Claude reason against actual comparables to produce a final ARV. The Zestimate is only used as a last-resort fallback.
- **Comps are listings, not closed sales.** RentCast's AVM endpoint returns nearby active/inactive listings, not a closed-sales MLS pull. Claude is explicitly aware of this and adjusts its reasoning accordingly.
- **Three independent checks on valuation:** RentCast's statistical model, Claude's comp categorization, and Claude's ARV synthesis reconciliation — all three must align for high confidence scores.
- **Confidence score is model-generated.** Claude assigns 1–10 based on data quality, comp availability, and how cleanly the signals aligned — not a formula.

---

## User Flow (for website how-it-works section)

1. **Enter an address** — type any US property address
2. **Set your parameters** — condition grade, market multiplier, repair mode, investor profit %, assignment fee
3. **Upload photos (optional)** — drag and drop listing or walkthrough photos for better condition scoring
4. **Run the analysis** — click Underwrite, pipeline runs in ~60–90 seconds
5. **Review the report** — full investment memo with comps, ARV, max offer, red/green flags, recommendation
6. **Adjust and re-run** — exclude comps, add manual comps, override ARV, change repair assumptions
7. **Export PDF** — download a branded report to share with sellers, buyers, or your team

---

## Tagline Options

- "Type an address. Get a full investment analysis in minutes."
- "AI-powered deal underwriting for real estate investors and wholesalers."
- "Live comps. AI condition scoring. Max offer calculation. All automated."
- "Underwrite deals in minutes, not days."
- "The underwriting stack that used to take your whole morning — done before your coffee's cold."

---

## Stats / Social Proof Angles (use actual numbers once available)

- Deals underwritten per month
- Average time per analysis (target: under 90 seconds)
- "4 AI calls, 3 data sources, 15 pipeline steps — in the time it takes to drive to the property"
- Accuracy vs. manual comps (if you have A/B data)
