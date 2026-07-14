// ─── Deal record ──────────────────────────────────────────────────────────────

export type DealStatus = "pending" | "completed" | "failed";

export interface Deal {
  id: string;
  user_id: string;
  address: string;
  status: DealStatus;
  report: UnderwritingReport | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Condition grade (user-selected) ─────────────────────────────────────────

export type ConditionGrade = "excellent" | "good" | "fair" | "poor";

export interface ExtraItem {
  label: string;
  cost: number;
  checked: boolean;
}

// ─── Axesso: Subject property ─────────────────────────────────────────────────

export interface PriceHistoryItem {
  date: string;
  price: number;
  pricePerSqft: number;
  event: string;
}

export interface PropertyDetails {
  zpid: number;
  listingType: string;
  address: string;
  notes?: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSizeSqft: number | undefined;
  yearBuilt: number;
  propertyType: string; // 'single-family' | 'condo' | 'multi-family' | etc.
  constructionMaterials: string[];
  cooling: string[];
  heating: string[];
  flooring: string[];
  roofType: string | null;
  stories: number | null;
  hasPrivatePool: boolean;
  hasGarage: boolean;
  hasOffStreetParking: boolean;
  homeStatus: string;
  daysOnZillow: number | null;
  priceHistory: PriceHistoryItem[];
  isBankOwned: boolean;
  isPreforeclosure: boolean;
  isAnyForeclosure: boolean;
  isFSBO: boolean;
  photos: string[]; // public image URLs — passed to Claude calls
  neighborhood: string | null;
  subdivision: string | null;
  zestimate: number | null;
  taxAssessedValue: number | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null; // ISO date
}

// ─── Axesso: Active listings ──────────────────────────────────────────────────

export interface ActiveListing {
  address: string;
  listPrice: number;
  listDate: string; // ISO date
  beds: number;
  baths: number;
  sqft: number;
  pricePerSqft: number;
  distanceMiles: number;
  daysOnMarket: number;
  yearBuilt: number | null;
  photos: string[];
}

// ─── RentCast: comps (replaces Axesso similar-solds as of the RentCast switch) ─

// Raw shape from GET /v1/avm/value?address=...&compCount=5
export interface RentCastComparable {
  id: string;
  formattedAddress: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number | null;
  yearBuilt: number | null;
  status: string;              // "Active" | "Inactive" — NOT a confirmed sale
  price: number;                // list price
  listingType: string | null;
  listedDate: string | null;
  removedDate: string | null;
  daysOnMarket: number | null;
  distance: number;             // miles from subject
  correlation: number;          // RentCast similarity score, 0–1
}

export interface RentCastAvmResponse {
  price: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  comparables: RentCastComparable[];
}

// Mapped output of Step 3 — RentCast's own AVM estimate plus comps normalized
// into our shape (no photos yet, category not yet assigned).
export interface RentCastCompsResult {
  avm: { value: number; low: number; high: number };
  comps: NormalizedComp[];
}

// ─── Normalized / filtered comps ──────────────────────────────────────────────

// Assigned by Claude in Step 8. Only 'arv' comps are used in ARV calculation.
export type CompCategory = "arv" | "turnkey" | "as_is";

export interface NormalizedComp {
  address: string;
  // NOTE: for comps sourced from RentCast, this is a list price, not a confirmed
  // sale price — RentCast's avm/value endpoint returns nearby listings, not closed
  // sales. salePrice/saleDate field names are kept for backward compatibility with
  // comps stored from before this change (which were genuine Axesso sold comps).
  salePrice: number;
  saleDate: string; // ISO date — may be empty string for RentCast-sourced comps
  sqft: number;
  lotSizeSqft?: number;
  pricePerSqft: number;
  beds: number;
  baths: number;
  photos: string[];
  // RentCast-only metadata — undefined for manual comps or pre-RentCast stored comps.
  listingStatus?: string;   // e.g. "Active" | "Inactive"
  daysOnMarket?: number | null;
  correlation?: number;     // RentCast's similarity score (0–1) vs. the subject
  // Set by Claude (Step 8/10). null until categorization runs.
  category: CompCategory | null;
}

// ─── Claude Call 1: Property condition ────────────────────────────────────────

export interface ConditionLineItem {
  category: string;
  notes: string;
}

export interface ConditionAssessment {
  score: number; // 1–10 overall condition score
  summary: string;
  lineItems: ConditionLineItem[];
}

// ─── Repair costs (Step 7) ────────────────────────────────────────────────────

export interface RepairCosts {
  condition: ConditionGrade;
  sqft: number;
  marketMultiplier: number;
  per_sqft_low: number;
  per_sqft_high: number;
  baseLow: number;
  baseHigh: number;
  extraItemsTotal: number;
  low: number;  // baseLow + extraItemsTotal
  high: number; // baseHigh + extraItemsTotal
  checkedExtraItems: { label: string; cost: number }[];
}

// ─── Claude Call 2: Comp validation + categorization ─────────────────────────

export interface RejectedComp {
  compIndex: number;
  reason: string;
}

export interface CompValidation {
  // NormalizedComps with category populated. Turnkey/as_is shown as
  // reference on the report; only arv comps feed the ARV synthesis call.
  validatedComps: NormalizedComp[];
  rejectedComps: RejectedComp[];
  analystNotes: string;
}

// ─── Claude Call 3: ARV synthesis — merges RentCast's AVM with arv comps ─────

export interface ArvSynthesisInput {
  property: PropertyDetails;
  condition: ConditionAssessment;
  rentcastAvm: { value: number; low: number; high: number };
  arvComps: NormalizedComp[]; // category === "arv" only
}

export interface ArvSynthesisResult {
  arv: number;
  arvLow: number;
  arvHigh: number;
  reasoning: string; // how RentCast's AVM vs. the comps were weighed — folded into the final report's market narrative
}

// ─── ARV result (Step 9a) ─────────────────────────────────────────────────────

export interface ARVResult {
  arv: number;
  arvLow: number;
  arvHigh: number;
  avgPricePerSqft: number;
  compsUsed: number;
  methodology: "claude-synthesis" | "zestimate-fallback" | "manual-override" | "unavailable";
  reasoning?: string; // present when methodology is "claude-synthesis"
}

// ─── Max offer result (Step 9b) ───────────────────────────────────────────────

export interface MaxOfferResult {
  netSalesPrice: number; // ARV × 0.92
  closingCosts: number; // ARV × 0.02
  realtorFees: number; // ARV × 0.06
  investorProfitPct: number; // e.g. 0.15 = 15% of netSalesPrice
  investorProfit: number; // netSalesPrice × investorProfitPct
  assignmentFee: number; // minimum assignment fee, default 22500
  maxOfferLow: number; // netSalesPrice − repairs.high − investorProfit − assignmentFee
  maxOfferHigh: number; // netSalesPrice − repairs.low  − investorProfit − assignmentFee
}

// ─── Claude Call 4: Final underwriting report ─────────────────────────────────

export type DealRecommendation = "pursue" | "negotiate" | "pass";

export interface UnderwritingReport {
  address: string;
  generatedAt: string; // ISO datetime
  property: PropertyDetails;
  comps: NormalizedComp[];
  condition: ConditionAssessment;
  repairs: RepairCosts;
  arv: ARVResult;
  financials: MaxOfferResult;
  // Accumulated workflow + Claude flags.
  // Examples: 'sqft_range_expanded', 'distance_expanded', 'comp_older_6_months',
  //           'tenant_occupied', 'no_permits', 'major_road_comp', 'cross_arterial_comp'
  flags: string[];
  executiveSummary: string;
  propertyNarrative: string;
  marketNarrative: string;
  redFlags: string[];
  greenFlags: string[];
  recommendation: DealRecommendation;
  confidenceScore: number; // 1–10
}

// ─── Claude Call 4 input bundle ───────────────────────────────────────────────

export interface ReportGenerationInput {
  property: PropertyDetails;
  conditionGrade: ConditionGrade;
  marketMultiplier: number;
  condition: ConditionAssessment;
  repairs: RepairCosts;
  arv: ARVResult; // arv.reasoning (if present) is the ARV-synthesis explanation from Call 3
  validatedComps: NormalizedComp[];
  financials: MaxOfferResult;
  flags: string[];
}

// ─── API request / response ───────────────────────────────────────────────────

export interface UploadedPhoto {
  data: string; // base64, no data: prefix
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

export interface ManualComp {
  address: string;
  compType?: CompCategory;    // if set, category is pre-assigned and Claude skips it
  salePrice?: number;
  saleDate?: string;          // ISO date
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSizeSqft?: number;
  yearBuilt?: number;
  constructionType?: string;
}

export type RepairMode = 'known_cost' | 'scope_known' | 'standard';

export interface UnderwriteRequest {
  address: string;
  notes?: string;
  overrides?: { beds?: number; baths?: number; sqft?: number }; // override Zillow values
  repairMode?: RepairMode;      // defaults to 'standard'
  condition?: ConditionGrade;   // required for scope_known + standard; optional for known_cost
  knownRepairCost?: number;     // Mode 1 only: user-provided definite repair cost
  customPerSqft?: number;       // Mode 3 only: overrides the default per-sqft range
  marketMultiplier: number;
  extraItems: ExtraItem[];
  investorProfitPct?: number;   // 0–1, defaults to 0.15
  assignmentFee?: number;       // defaults to 22500
  dealId?: string;              // present on re-run
  propertyPhotos?: UploadedPhoto[];
  baseComps?: NormalizedComp[]; // re-run: stored comps minus user-excluded ones
  manualComps?: ManualComp[];   // re-run: comps entered manually by user
  arvOverride?: { mode: "per_sqft" | "fixed"; value: number }; // re-run: bypass comp-based ARV
}

export interface UnderwriteResponse {
  dealId: string;
  report: UnderwritingReport;
  usageSummary?: {
    call1_condition: { inputTokens: number; outputTokens: number };
    call2_comps:     { inputTokens: number; outputTokens: number; skipped?: true };
    call3_arv:       { inputTokens: number; outputTokens: number; skipped?: true };
    call4_report:    { inputTokens: number; outputTokens: number };
    total:           { inputTokens: number; outputTokens: number };
    estimatedCostUsd: number;
  };
}

export interface UnderwriteErrorResponse {
  error: string;
  dealId?: string;
}
