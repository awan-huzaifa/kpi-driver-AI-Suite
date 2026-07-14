import type {
  ConditionGrade,
  ExtraItem,
  PropertyDetails,
  RepairCosts,
  MaxOfferResult,
} from "@/lib/underwriting/types";

// ─── Constants ────────────────────────────────────────────────────────────────

// Exported for the Zestimate-fallback path in route.ts (used when RentCast/Claude ARV synthesis is unavailable).
export const ARV_LOW_FACTOR = 0.97;
export const ARV_HIGH_FACTOR = 1.03;
const NET_SALES_FACTOR = 0.92;
const CLOSING_COST_FACTOR = 0.02;
const REALTOR_FEE_FACTOR = 0.06;

const REPAIR_PER_SQFT: Record<ConditionGrade, { low: number; high: number }> = {
  excellent: { low: 0,  high: 15 },
  good:      { low: 25, high: 35 },
  fair:      { low: 40, high: 50 },
  poor:      { low: 55, high: 65 },
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7a — Mode: "known_cost" — user supplied a definite repair dollar amount
// ─────────────────────────────────────────────────────────────────────────────
export function calcRepairCostsKnown(knownCost: number): RepairCosts {
  console.log("\n" + "─".repeat(50));
  console.log("CALC — calcRepairCostsKnown — knownCost:", knownCost);
  return {
    condition:        "fair",  // placeholder — not used financially in this mode
    sqft:             0,
    marketMultiplier: 1,
    per_sqft_low:     0,
    per_sqft_high:    0,
    baseLow:          knownCost,
    baseHigh:         knownCost,
    extraItemsTotal:  0,
    low:              knownCost,
    high:             knownCost,
    checkedExtraItems: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7b — Mode: "scope_known" — cost comes entirely from itemised repair list
// extraItems arriving here are pre-filtered to only the checked/added ones
// ─────────────────────────────────────────────────────────────────────────────
export function calcRepairCostsScope(condition: ConditionGrade, extraItems: ExtraItem[]): RepairCosts {
  const checkedExtraItems = extraItems.map(({ label, cost }) => ({ label, cost }));
  const total = checkedExtraItems.reduce((sum, i) => sum + i.cost, 0);
  console.log("\n" + "─".repeat(50));
  console.log("CALC — calcRepairCostsScope — condition:", condition, "| items:", checkedExtraItems.length, "| total:", total);
  return {
    condition,
    sqft:             0,
    marketMultiplier: 1,
    per_sqft_low:     0,
    per_sqft_high:    0,
    baseLow:          0,
    baseHigh:         0,
    extraItemsTotal:  total,
    low:              total,
    high:             total,
    checkedExtraItems,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7c — Mode: "standard" — condition grade × sqft, optional custom per-sqft
// ─────────────────────────────────────────────────────────────────────────────
export function calcRepairCosts(
  condition: ConditionGrade,
  sqft: number,
  marketMultiplier: number,
  extraItems: ExtraItem[],
  customPerSqft?: number,
): RepairCosts {
  const range       = REPAIR_PER_SQFT[condition];
  const perSqftLow  = (customPerSqft !== undefined && customPerSqft > 0) ? customPerSqft : range.low;
  const perSqftHigh = (customPerSqft !== undefined && customPerSqft > 0) ? customPerSqft : range.high;

  console.log("\n" + "─".repeat(50));
  console.log("CALC — calcRepairCosts");
  console.log("─".repeat(50));
  console.log("[calcRepairCosts] INPUTS → condition:", condition, "| sqft:", sqft, "| marketMultiplier:", marketMultiplier, "| customPerSqft:", customPerSqft);
  console.log("[calcRepairCosts] REPAIR RATE → low: $", perSqftLow, "/sqft | high: $", perSqftHigh, "/sqft");
  console.log("[calcRepairCosts] ALL extraItems:", JSON.stringify(extraItems, null, 2));

  const baseLow  = Math.round(perSqftLow  * sqft * marketMultiplier);
  const baseHigh = Math.round(perSqftHigh * sqft * marketMultiplier);

  console.log("[calcRepairCosts] BASE CALC → baseLow:", perSqftLow, "×", sqft, "×", marketMultiplier, "=", baseLow);
  console.log("[calcRepairCosts] BASE CALC → baseHigh:", perSqftHigh, "×", sqft, "×", marketMultiplier, "=", baseHigh);

  const checkedExtraItems = extraItems
    .filter((item) => item.checked)
    .map(({ label, cost }) => ({ label, cost }));

  const extraItemsTotal = checkedExtraItems.reduce((sum, i) => sum + i.cost, 0);

  console.log("[calcRepairCosts] CHECKED EXTRA ITEMS:", JSON.stringify(checkedExtraItems, null, 2));
  console.log("[calcRepairCosts] extraItemsTotal:", extraItemsTotal);

  const result: RepairCosts = {
    condition,
    sqft,
    marketMultiplier,
    per_sqft_low:  perSqftLow,
    per_sqft_high: perSqftHigh,
    baseLow,
    baseHigh,
    extraItemsTotal,
    low:  baseLow  + extraItemsTotal,
    high: baseHigh + extraItemsTotal,
    checkedExtraItems,
  };

  console.log("[calcRepairCosts] OUTPUT:", JSON.stringify(result, null, 2));

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARV adjustments — property features that add value above the comp average
// ─────────────────────────────────────────────────────────────────────────────
export function calcARVAdjustments(property: PropertyDetails): number {
  console.log("\n" + "─".repeat(50));
  console.log("CALC — calcARVAdjustments");
  console.log("─".repeat(50));
  console.log("[calcARVAdjustments] INPUTS → constructionMaterials:", property.constructionMaterials, "| hasPrivatePool:", property.hasPrivatePool, "| hasGarage:", property.hasGarage, "| hasOffStreetParking:", property.hasOffStreetParking);

  let adjustment = 0;

  const materials = property.constructionMaterials.map((m) => m.toLowerCase());
  const hasPremiumMaterial = materials.some((m) => m.includes("concrete") || m.includes("brick") || m.includes("stone"));
  if (hasPremiumMaterial) {
    adjustment += 17_500;
    console.log("[calcARVAdjustments] constructionMaterials match (concrete/brick/stone) → +$17,500");
  } else {
    console.log("[calcARVAdjustments] constructionMaterials no premium match → +$0");
  }

  if (property.hasPrivatePool) {
    adjustment += 30_000;
    console.log("[calcARVAdjustments] hasPrivatePool = true → +$30,000");
  } else {
    console.log("[calcARVAdjustments] hasPrivatePool = false → +$0");
  }

  if (property.hasGarage) {
    adjustment += 15_000;
    console.log("[calcARVAdjustments] hasGarage = true → +$15,000");
  } else {
    console.log("[calcARVAdjustments] hasGarage = false → +$0");
  }

  if (property.hasOffStreetParking) {
    adjustment += 10_000;
    console.log("[calcARVAdjustments] hasOffStreetParking = true → +$10,000");
  } else {
    console.log("[calcARVAdjustments] hasOffStreetParking = false → +$0");
  }

  console.log("[calcARVAdjustments] TOTAL ARV ADJUSTMENT: $" + adjustment.toLocaleString());

  return adjustment;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 10 — Full offer stack from ARV + repair range
// (ARV itself now comes from Claude's synthesizeARV — see claude.ts)
// ─────────────────────────────────────────────────────────────────────────────
export function calcMaxOffer(arv: number, repairs: RepairCosts, investorProfitPct = 0.15, assignmentFee = 22_500): MaxOfferResult {
  console.log("\n" + "─".repeat(50));
  console.log("CALC — calcMaxOffer");
  console.log("─".repeat(50));
  console.log("[calcMaxOffer] INPUTS → arv: $" + arv.toLocaleString() + " | repairs.low: $" + repairs.low.toLocaleString() + " | repairs.high: $" + repairs.high.toLocaleString() + " | investorProfitPct: " + (investorProfitPct * 100).toFixed(1) + "% | assignmentFee: $" + assignmentFee.toLocaleString());

  const netSalesPrice  = arv * NET_SALES_FACTOR;
  const closingCosts   = arv * CLOSING_COST_FACTOR;
  const realtorFees    = arv * REALTOR_FEE_FACTOR;
  const investorProfit = netSalesPrice * investorProfitPct;

  console.log("[calcMaxOffer] netSalesPrice:", arv, "×", NET_SALES_FACTOR, "=", netSalesPrice.toFixed(2));
  console.log("[calcMaxOffer] closingCosts:", arv, "×", CLOSING_COST_FACTOR, "=", closingCosts.toFixed(2));
  console.log("[calcMaxOffer] realtorFees:", arv, "×", REALTOR_FEE_FACTOR, "=", realtorFees.toFixed(2));
  console.log("[calcMaxOffer] investorProfit:", netSalesPrice.toFixed(2), "×", investorProfitPct, "=", investorProfit.toFixed(2));
  console.log("[calcMaxOffer] assignmentFee: $" + assignmentFee.toLocaleString());
  console.log("[calcMaxOffer] maxOfferLow:", netSalesPrice.toFixed(2), "-", repairs.high, "-", investorProfit.toFixed(2), "-", assignmentFee, "=", (netSalesPrice - repairs.high - investorProfit - assignmentFee).toFixed(2));
  console.log("[calcMaxOffer] maxOfferHigh:", netSalesPrice.toFixed(2), "-", repairs.low, "-", investorProfit.toFixed(2), "-", assignmentFee, "=", (netSalesPrice - repairs.low - investorProfit - assignmentFee).toFixed(2));

  const result: MaxOfferResult = {
    netSalesPrice,
    closingCosts,
    realtorFees,
    investorProfitPct,
    investorProfit,
    assignmentFee,
    maxOfferLow:  netSalesPrice - repairs.high - investorProfit - assignmentFee,
    maxOfferHigh: netSalesPrice - repairs.low  - investorProfit - assignmentFee,
  };

  console.log("[calcMaxOffer] OUTPUT:", JSON.stringify(result, null, 2));

  return result;
}
