import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logUsage } from "@/lib/ai-usage";
import { autoTopupIfNeeded } from "@/lib/wallet";
import { searchProperty, fetchPhotosByAddress } from "@/lib/underwriting/axesso";
import { searchComps } from "@/lib/underwriting/rentcast";
import { calcRepairCosts, calcMaxOffer, calcARVAdjustments, ARV_LOW_FACTOR, ARV_HIGH_FACTOR } from "@/lib/underwriting/calculations";
import {
  assessPropertyCondition,
  validateAndCategorizeComps,
  synthesizeARV,
  generateUnderwritingReport,
  type CallTokens,
} from "@/lib/underwriting/claude";
import type {
  NormalizedComp,
  ARVResult,
  ConditionGrade,
  ManualComp,
  PropertyDetails,
  UnderwriteRequest,
  UnderwriteResponse,
  UnderwriteErrorResponse,
  UnderwritingReport,
} from "@/lib/underwriting/types";

// ── Resolve a user-entered manual comp into a NormalizedComp ──────────────────
async function resolveManualComp(comp: ManualComp): Promise<NormalizedComp> {
  const hasSufficientData = comp.salePrice != null && comp.sqft != null && comp.sqft > 0;

  if (hasSufficientData) {
    const sqft = comp.sqft!;
    const salePrice = comp.salePrice!;
    return {
      address: comp.address,
      salePrice,
      saleDate: comp.saleDate ?? "",
      sqft,
      pricePerSqft: Math.round(salePrice / sqft),
      beds: comp.beds ?? 0,
      baths: comp.baths ?? 0,
      photos: [],
      category: comp.compType ?? null,
    };
  }

  // Address-only: call searchProperty to fill in property details
  try {
    const property = await searchProperty(comp.address);
    const lastSale = [...(property.priceHistory ?? [])]
      .filter((h) => h.event?.toLowerCase().includes("sold"))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const sqft = comp.sqft ?? property.sqft ?? 0;
    const salePrice = comp.salePrice ?? lastSale?.price ?? 0;
    return {
      address: comp.address,
      salePrice,
      saleDate: comp.saleDate ?? lastSale?.date ?? "",
      sqft,
      pricePerSqft: sqft > 0 ? Math.round(salePrice / sqft) : 0,
      beds: comp.beds ?? property.beds ?? 0,
      baths: comp.baths ?? property.baths ?? 0,
      photos: property.photos?.slice(0, 3) ?? [],
      category: comp.compType ?? null,
    };
  } catch {
    const sqft = comp.sqft ?? 0;
    const salePrice = comp.salePrice ?? 0;
    return {
      address: comp.address,
      salePrice,
      saleDate: comp.saleDate ?? "",
      sqft,
      pricePerSqft: sqft > 0 ? Math.round(salePrice / sqft) : 0,
      beds: comp.beds ?? 0,
      baths: comp.baths ?? 0,
      photos: [],
      category: comp.compType ?? null,
    };
  }
}

// ── ARV fallback when RentCast's AVM/Claude synthesis isn't available ────────
function fallbackArv(property: PropertyDetails, workflowFlags: string[]): ARVResult {
  if (property.zestimate) {
    const zestimate = property.zestimate;
    const avgPricePerSqft = property.sqft > 0 ? Math.round(zestimate / property.sqft) : 0;
    workflowFlags.push("arv_zestimate_fallback");
    console.log("[fallbackArv] Using Zestimate as ARV:", zestimate);
    return {
      arv: zestimate,
      arvLow:  zestimate * ARV_LOW_FACTOR,
      arvHigh: zestimate * ARV_HIGH_FACTOR,
      avgPricePerSqft,
      compsUsed: 0,
      methodology: "zestimate-fallback",
    };
  }
  workflowFlags.push("arv_unavailable");
  console.log("[fallbackArv] No RentCast AVM and no Zestimate — ARV unavailable");
  return { arv: 0, arvLow: 0, arvHigh: 0, avgPricePerSqft: 0, compsUsed: 0, methodology: "unavailable" };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<UnderwriteErrorResponse>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ── Parse + validate body ───────────────────────────────────────────────────
  let body: UnderwriteRequest;
  try {
    body = (await request.json()) as UnderwriteRequest;
  } catch {
    return NextResponse.json<UnderwriteErrorResponse>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const address = body.address?.trim();
  if (!address) {
    return NextResponse.json<UnderwriteErrorResponse>(
      { error: "address is required" },
      { status: 400 }
    );
  }

  const validGrades: ConditionGrade[] = ["excellent", "good", "fair", "poor"];
  if (!validGrades.includes(body.condition)) {
    return NextResponse.json<UnderwriteErrorResponse>(
      { error: "condition must be excellent, good, fair, or poor" },
      { status: 400 }
    );
  }

  const notes              = body.notes?.trim() || undefined;
  const condition          = body.condition;
  const marketMultiplier   = typeof body.marketMultiplier === "number" ? body.marketMultiplier : 1.0;
  const extraItems         = Array.isArray(body.extraItems) ? body.extraItems : [];
  const investorProfitPct  = typeof body.investorProfitPct === "number"
    ? Math.max(0.01, Math.min(0.99, body.investorProfitPct))
    : 0.15;
  const assignmentFee      = typeof body.assignmentFee === "number"
    ? Math.max(0, body.assignmentFee)
    : 22_500;
  const rerunDealId        = typeof body.dealId === "string" ? body.dealId : null;
  const propertyPhotos     = Array.isArray(body.propertyPhotos) && body.propertyPhotos.length > 0
    ? body.propertyPhotos
    : undefined;
  const baseComps          = rerunDealId && Array.isArray(body.baseComps) ? body.baseComps as NormalizedComp[] : null;
  const manualCompsInput   = Array.isArray(body.manualComps) ? body.manualComps as ManualComp[] : [];
  const arvOverride        = body.arvOverride?.mode && typeof body.arvOverride.value === "number" && body.arvOverride.value > 0
    ? body.arvOverride
    : null;

  // Fetch user's company + wallet balance (needed for gate check and billing)
  const { data: userProfile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();
  const companyId = userProfile?.company_id ?? null;

  // Wallet balance pre-check — reject before running the expensive pipeline
  if (companyId) {
    const adminDb = createAdminClient();
    const { data: companyRow } = await adminDb
      .from("companies")
      .select("wallet_balance")
      .eq("id", companyId)
      .single();
    if ((companyRow?.wallet_balance ?? 0) <= 0) {
      return NextResponse.json<UnderwriteErrorResponse>(
        { error: "Insufficient wallet balance" },
        { status: 402 }
      );
    }
  }

  // Track deal ID so the catch block can mark it failed
  let dealId: string | null = null;

  try {
    // ── STEP 1: Create new deal OR reset existing deal for re-run ───────────
    if (rerunDealId) {
      const { data: existing, error: verifyErr } = await supabase
        .from("deals")
        .select("id")
        .eq("id", rerunDealId)
        .eq("user_id", user.id)
        .single();

      if (verifyErr || !existing) {
        return NextResponse.json<UnderwriteErrorResponse>({ error: "Deal not found" }, { status: 404 });
      }

      await supabase.from("underwriting_reports").delete().eq("deal_id", rerunDealId);
      await supabase.from("deals").update({
        status: "pending",
        recommendation: null,
        arv_low: null,
        arv_high: null,
        max_offer: null,
        error_message: null,
      }).eq("id", rerunDealId);

      dealId = rerunDealId;
    } else {
      // Reuse an existing failed row for the same address instead of creating a new one
      const { data: existingFailed } = await supabase
        .from("deals")
        .select("id")
        .eq("user_id", user.id)
        .eq("address", address)
        .eq("status", "failed")
        .limit(1)
        .single();

      if (existingFailed) {
        await supabase.from("deals").update({
          status: "pending",
          recommendation: null,
          arv_low: null,
          arv_high: null,
          max_offer: null,
          error_message: null,
        }).eq("id", existingFailed.id);
        dealId = existingFailed.id as string;
      } else {
        const { data: deal, error: createError } = await supabase
          .from("deals")
          .insert({ user_id: user.id, address, status: "pending" })
          .select("id")
          .single();

        if (createError || !deal) {
          throw new Error(`Failed to create deal record: ${createError?.message}`);
        }
        dealId = deal.id as string;
      }
    }

    // ── STEP 2: Axesso — searchProperty (subject property details) ──────────
    const property = await searchProperty(address);
    if (!property.zpid || !property.address) {
      throw new Error("Property not found — please enter a valid property address.");
    }
    if (notes) property.notes = notes;
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[STEP 2] PROPERTY", JSON.stringify(property, null, 2));

    const workflowFlags: string[] = [];

    // ── STEP 3: RentCast — AVM estimate (always) + comps (fresh deals only) ──
    // The AVM is refreshed even on re-runs (cheap, and Claude's ARV synthesis
    // needs it); the comps themselves are only used for fresh deals — re-runs
    // reuse whatever comps the user kept from the previous run.
    let rentcastAvm: { value: number; low: number; high: number } | null = null;
    let rentcastComps: NormalizedComp[] = [];
    try {
      const rentcastResult = await searchComps(address, 5);
      rentcastAvm = rentcastResult.avm;
      rentcastComps = rentcastResult.comps;
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[STEP 3] RENTCAST AVM:", JSON.stringify(rentcastAvm));
    } catch (err) {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[STEP 3] RentCast call failed — continuing without AVM/comps:", err);
      workflowFlags.push("rentcast_unavailable");
    }

    let normalizedComps: NormalizedComp[];

    if (baseComps !== null) {
      // Re-run: reuse the stored comps the user chose to keep.
      // Preserve user-set categories (locked); null means "let Claude decide".
      normalizedComps = baseComps.map((c) => ({ ...c }));
      console.log(`[STEP 3] RE-RUN — using ${normalizedComps.length} stored base comps (RentCast comps discarded, AVM refreshed above)`);
    } else if (rentcastComps.length > 0) {
      // ── STEP 4: Resolve comp photos via Axesso (address → zpid → photos), in parallel ─
      const photosByComp = await Promise.all(rentcastComps.map((c) => fetchPhotosByAddress(c.address)));
      normalizedComps = rentcastComps.map((c, i) => ({ ...c, photos: photosByComp[i] }));
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`[STEP 4] PHOTOS RESOLVED for ${normalizedComps.length} RentCast comps via Axesso`,
        JSON.stringify(normalizedComps.map((c) => ({ address: c.address, photoCount: c.photos.length })), null, 2));
    } else {
      normalizedComps = [];
    }

    // ── STEP 5: Resolve manual comps ─────────────────────────────────────────
    const resolvedManualComps: NormalizedComp[] = manualCompsInput.length > 0
      ? await Promise.all(manualCompsInput.map(resolveManualComp))
      : [];
    if (resolvedManualComps.length > 0) {
      console.log(`[STEP 5] MANUAL COMPS resolved (${resolvedManualComps.length}):`, JSON.stringify(resolvedManualComps.map(c => ({ address: c.address, category: c.category, salePrice: c.salePrice })), null, 2));
    }

    // ── STEP 6: Merge + split for Claude ─────────────────────────────────────
    const allComps = [...normalizedComps, ...resolvedManualComps];
    // Comps where user pre-assigned a category bypass Claude entirely
    const lockedComps  = allComps.filter((c) => c.category !== null);
    const compsForClaude = allComps.filter((c) => c.category === null);

    if (allComps.length === 0) workflowFlags.push("no_comps_available");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`[STEP 6] allComps: ${allComps.length} | forClaude: ${compsForClaude.length} | locked: ${lockedComps.length}`);
    console.log("[STEP 6] USER INPUTS → condition:", condition, "| multiplier:", marketMultiplier, "| extraItems:", JSON.stringify(extraItems));

    // ── STEP 7: Claude Call 1 — Property condition assessment (photos + notes) ─
    const { _tokens: call1Tokens, ...conditionAssessment } = await assessPropertyCondition(property, condition, propertyPhotos);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[STEP 7] CLAUDE CALL 1 — CONDITION ASSESSMENT", JSON.stringify(conditionAssessment, null, 2));

    // ── STEP 8: Calculate repair costs from user-selected condition grade ─────
    const arvAdjustment = calcARVAdjustments(property);
    const repairCosts   = calcRepairCosts(condition, property.sqft, marketMultiplier, extraItems);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[STEP 8] ARV ADJUSTMENT:", arvAdjustment);
    console.log("[STEP 8] REPAIR COSTS", JSON.stringify(repairCosts, null, 2));

    // ── STEP 9: Claude Call 2 — Comp validation and categorization ───────────
    // Only comps with category=null go to Claude. Locked comps (user-specified
    // type) are merged back in after without Claude touching their category.
    let validatedComps: NormalizedComp[] = [];
    let compValidation: { validatedComps: NormalizedComp[]; rejectedComps: { compIndex: number; reason: string }[]; analystNotes: string };
    let call2Tokens: CallTokens | null = null;

    if (compsForClaude.length > 0) {
      const rawValidation = await validateAndCategorizeComps(compsForClaude, property, condition);
      call2Tokens = rawValidation._tokens;
      compValidation = rawValidation;
      validatedComps = [...compValidation.validatedComps, ...lockedComps];
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[STEP 9] CLAUDE CALL 2 — COMP CATEGORIZATION");
      console.log("  Analyst notes:", compValidation.analystNotes);
      console.log("  Rejected:", JSON.stringify(compValidation.rejectedComps));
      console.log("  Claude-validated:", compValidation.validatedComps.length, "| locked:", lockedComps.length);
      console.log("  All validated comps:", JSON.stringify(validatedComps.map(c => ({ address: c.address, category: c.category, pricePerSqft: c.pricePerSqft })), null, 2));
    } else if (lockedComps.length > 0) {
      // All comps were user-specified — skip Claude Call 2 entirely
      validatedComps = lockedComps;
      compValidation = { validatedComps: lockedComps, rejectedComps: [], analystNotes: "All comps were user-specified with locked categories." };
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[STEP 9] SKIPPED — all comps are user-locked");
    } else {
      compValidation = { validatedComps: [], rejectedComps: [], analystNotes: "No comparable properties available for this address." };
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[STEP 9] SKIPPED — no comps to categorize");
    }

    // ── STEP 10: Claude Call 3 — ARV synthesis (RentCast AVM + arv comps) ────
    const arvCompsForSynthesis = validatedComps.filter((c) => c.category === "arv");

    let arvResult: ARVResult;
    let call3Tokens: CallTokens | null = null;

    if (arvOverride) {
      const arv = arvOverride.mode === "per_sqft"
        ? arvOverride.value * property.sqft + arvAdjustment
        : arvOverride.value;
      const avgPricePerSqft = arvOverride.mode === "per_sqft"
        ? arvOverride.value
        : (property.sqft > 0 ? Math.round(arv / property.sqft) : 0);
      arvResult = {
        arv,
        arvLow:  arv * ARV_LOW_FACTOR,
        arvHigh: arv * ARV_HIGH_FACTOR,
        avgPricePerSqft,
        compsUsed: 0,
        methodology: "manual-override",
      };
      workflowFlags.push(arvOverride.mode === "per_sqft" ? "arv_manual_per_sqft_override" : "arv_manual_fixed_override");
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`[STEP 10] MANUAL ARV OVERRIDE — mode: ${arvOverride.mode} | value: ${arvOverride.value} | arv: ${arv}`);
    } else if (rentcastAvm) {
      try {
        const { _tokens, arv, arvLow, arvHigh, reasoning } = await synthesizeARV({
          property,
          condition: conditionAssessment,
          rentcastAvm,
          arvComps: arvCompsForSynthesis,
        });
        call3Tokens = _tokens;
        arvResult = {
          arv, arvLow, arvHigh,
          avgPricePerSqft: property.sqft > 0 ? Math.round(arv / property.sqft) : 0,
          compsUsed: arvCompsForSynthesis.length,
          methodology: "claude-synthesis",
          reasoning,
        };
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("[STEP 10] CLAUDE CALL 3 — ARV SYNTHESIS", JSON.stringify({ arv, arvLow, arvHigh, reasoning }, null, 2));
      } catch (err) {
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("[STEP 10] Claude ARV synthesis failed, falling back:", err);
        arvResult = fallbackArv(property, workflowFlags);
      }
    } else {
      arvResult = fallbackArv(property, workflowFlags);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[STEP 10] ARV RESULT", JSON.stringify(arvResult, null, 2));

    const maxOfferResult = calcMaxOffer(arvResult.arv, repairCosts, investorProfitPct, assignmentFee);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[STEP 11] MAX OFFER RESULT", JSON.stringify(maxOfferResult, null, 2));

    // ── STEP 12: Claude Call 4 — Final underwriting report ───────────────────
    const { _tokens: call4Tokens, ...report } = await generateUnderwritingReport({
      property,
      conditionGrade: condition,
      marketMultiplier,
      condition: conditionAssessment,
      repairs: repairCosts,
      arv: arvResult,
      validatedComps,
      financials: maxOfferResult,
      flags: workflowFlags,
    });
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[STEP 12] CLAUDE CALL 4 — FINAL REPORT");
    console.log("  Recommendation:", report.recommendation, "| Confidence:", report.confidenceScore);
    console.log("  Executive summary:", report.executiveSummary);
    console.log("  Red flags:", report.redFlags);
    console.log("  Green flags:", report.greenFlags);
    console.log("  Full report:", JSON.stringify(report, null, 2));

    // ── USAGE SUMMARY ────────────────────────────────────────────────────────
    const INPUT_COST_PER_TOKEN  = 5  / 1_000_000; // claude-opus-4-7: $5/M input tokens
    const OUTPUT_COST_PER_TOKEN = 25 / 1_000_000; // claude-opus-4-7: $25/M output tokens
    const RENTCAST_COST_USD     = 0.074;           // $74/mo / 1,000 requests
    const AXESSO_COST_USD       = 0.020;           // €15 / 10,000 calls, ~12 calls/deal ≈ $0.018 → $0.020
    const totalInput  = call1Tokens.inputTokens  + (call2Tokens?.inputTokens  ?? 0) + (call3Tokens?.inputTokens  ?? 0) + call4Tokens.inputTokens;
    const totalOutput = call1Tokens.outputTokens + (call2Tokens?.outputTokens ?? 0) + (call3Tokens?.outputTokens ?? 0) + call4Tokens.outputTokens;
    const claudeCostUsd     = totalInput * INPUT_COST_PER_TOKEN + totalOutput * OUTPUT_COST_PER_TOKEN;
    const estimatedCostUsd  = claudeCostUsd + RENTCAST_COST_USD + AXESSO_COST_USD;
    const usageSummary = {
      call1_condition: call1Tokens,
      call2_comps:     call2Tokens ?? { inputTokens: 0, outputTokens: 0, skipped: true as const },
      call3_arv:       call3Tokens ?? { inputTokens: 0, outputTokens: 0, skipped: true as const },
      call4_report:    call4Tokens,
      total:           { inputTokens: totalInput, outputTokens: totalOutput },
      estimatedCostUsd,
    };
    console.log("\n" + "=".repeat(60));
    console.log("USAGE SUMMARY — ALL CLAUDE CALLS THIS RUN");
    console.log("=".repeat(60));
    console.log(`  Call 1 (condition): in=${call1Tokens.inputTokens.toLocaleString()}  out=${call1Tokens.outputTokens.toLocaleString()}`);
    console.log(`  Call 2 (comps):     in=${(call2Tokens?.inputTokens ?? 0).toLocaleString()}  out=${(call2Tokens?.outputTokens ?? 0).toLocaleString()}${!call2Tokens ? "  [skipped — all comps locked]" : ""}`);
    console.log(`  Call 3 (arv):       in=${(call3Tokens?.inputTokens ?? 0).toLocaleString()}  out=${(call3Tokens?.outputTokens ?? 0).toLocaleString()}${!call3Tokens ? "  [skipped — fallback ARV used]" : ""}`);
    console.log(`  Call 4 (report):    in=${call4Tokens.inputTokens.toLocaleString()}  out=${call4Tokens.outputTokens.toLocaleString()}`);
    console.log("-".repeat(60));
    console.log(`  TOTAL:              in=${totalInput.toLocaleString()}  out=${totalOutput.toLocaleString()}`);
    console.log(`  CLAUDE COST:        $${claudeCostUsd.toFixed(4)} USD`);
    console.log(`  RENTCAST:           $${RENTCAST_COST_USD.toFixed(4)} USD`);
    console.log(`  AXESSO:             $${AXESSO_COST_USD.toFixed(4)} USD`);
    console.log(`  TOTAL RAW COST:     $${estimatedCostUsd.toFixed(4)} USD`);
    console.log("=".repeat(60) + "\n");

    // ── STEP 13: Save completed report to underwriting_reports ──────────────
    const { error: reportError } = await supabase
      .from("underwriting_reports")
      .insert({
        deal_id: dealId,
        user_id: user.id,
        address: property.address,
        beds: property.beds,
        baths: property.baths,
        sqft: Number(property.sqft),
        year_built: property.yearBuilt,
        condition: condition,
        arv_low: arvResult.arvLow,
        arv_high: arvResult.arvHigh,
        avg_price_per_sqft: arvResult.avgPricePerSqft,
        net_sales_price: maxOfferResult.netSalesPrice,
        repair_cost_low: repairCosts.low,
        repair_cost_high: repairCosts.high,
        investor_profit: maxOfferResult.investorProfit,
        max_offer_low: maxOfferResult.maxOfferLow,
        max_offer_high: maxOfferResult.maxOfferHigh,
        property_data: property,
        comps: validatedComps,
        calculations: { arvResult, repairCosts, maxOfferResult, rentcastAvm },
        ai_assessment: {
          conditionAssessment,
          analystNotes: compValidation.analystNotes,
          executiveSummary: report.executiveSummary,
          propertyNarrative: report.propertyNarrative,
          marketNarrative: report.marketNarrative,
          redFlags: report.redFlags,
          greenFlags: report.greenFlags,
        },
        flags: report.flags,
        recommendation: report.recommendation,
        confidence: String(report.confidenceScore),
        summary: report.executiveSummary,
      });

    if (reportError) {
      throw new Error(`Failed to save report: ${reportError.message}`);
    }

    // ── STEP 14: Update deal status to completed ─────────────────────────────
    const { error: dealUpdateError } = await supabase
      .from("deals")
      .update({
        status: "completed",
        recommendation: report.recommendation,
        arv_low: arvResult.arvLow,
        arv_high: arvResult.arvHigh,
        max_offer: maxOfferResult.maxOfferLow,
      })
      .eq("id", dealId);

    if (dealUpdateError) {
      throw new Error(`Failed to update deal status: ${dealUpdateError.message}`);
    }

    // ── STEP 15: Log aggregated AI usage + deduct from company wallet ────────
    if (companyId && dealId) {
      const adminDb = createAdminClient();
      const { data: cfgRows } = await adminDb
        .from("billing_config")
        .select("multiplier, company_id")
        .eq("app", "underwriting")
        .or(`company_id.eq.${companyId},company_id.is.null`);
      const companyCfg   = cfgRows?.find(r => r.company_id === companyId);
      const globalCfg    = cfgRows?.find(r => r.company_id === null);
      const multiplier   = Number(companyCfg?.multiplier ?? globalCfg?.multiplier ?? 3.0);
      const deductionUsd = estimatedCostUsd * multiplier;

      void logUsage({
        company_id:    companyId,
        app:           "underwriting",
        entity_id:     dealId,
        entity_type:   "deal",
        input_tokens:  totalInput,
        output_tokens: totalOutput,
        cost_usd:      deductionUsd,
        model:         "claude-opus-4-7",
        cost_breakdown: {
          property_api_1: parseFloat((AXESSO_COST_USD   * multiplier).toFixed(6)),
          property_api_2: parseFloat((RENTCAST_COST_USD * multiplier).toFixed(6)),
          ai:             parseFloat((claudeCostUsd      * multiplier).toFixed(6)),
        },
      });

      if (deductionUsd > 0) {
        const { data: newBalance, error: deductErr } = await adminDb.rpc("deduct_wallet_balance", {
          p_company_id:  companyId,
          p_amount_usd:  deductionUsd,
          p_description: `Deal underwriting: ${address}`,
          p_app:         "underwriting",
        });
        if (deductErr) console.error("[underwrite] wallet deduction failed:", deductErr.message);
        else void autoTopupIfNeeded(companyId, Number(newBalance));
      }
    }

    // ── STEP 16: Return final report to frontend ─────────────────────────────
    return NextResponse.json<UnderwriteResponse>({ dealId: dealId!, report: report as UnderwritingReport, usageSummary });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    // Mark deal failed — fire-and-forget so we return promptly
    if (dealId) {
      await supabase
        .from("deals")
        .update({ status: "failed" })
        .eq("id", dealId)
        .then(() => void 0);
    }

    console.error(`[underwrite] deal=${dealId ?? "none"} error:`, err);

    return NextResponse.json<UnderwriteErrorResponse>(
      { error: message, ...(dealId && { dealId }) },
      { status: 500 }
    );
  }
}
