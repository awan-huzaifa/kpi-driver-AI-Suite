import Anthropic from "@anthropic-ai/sdk";
import type {
  PropertyDetails,
  NormalizedComp,
  ConditionAssessment,
  CompValidation,
  UnderwritingReport,
  ReportGenerationInput,
  CompCategory,
  ConditionGrade,
  DealRecommendation,
  UploadedPhoto,
  ArvSynthesisInput,
  ArvSynthesisResult,
} from "@/lib/underwriting/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY_DEAL_UNDERWRITER, maxRetries: 5 });

const MODEL: Anthropic.Model = "claude-opus-5-5";

export type CallTokens = { inputTokens: number; outputTokens: number };

function extractJSON(text: string | undefined, label: string): string {
  if (!text) throw new Error(`Claude ${label}: response contained no text block`);
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

type Base64Source = {
  type: "base64";
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
};

async function fetchImageAsBase64(url: string): Promise<Base64Source | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const media_type = (validTypes.includes(contentType) ? contentType : "image/jpeg") as Base64Source["media_type"];
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    return { type: "base64", media_type, data };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE CALL 1  (STEP 6)
// ─────────────────────────────────────────────────────────────────────────────
export async function assessPropertyCondition(
  property: PropertyDetails,
  conditionGrade: ConditionGrade,
  uploadedPhotos?: UploadedPhoto[]
): Promise<ConditionAssessment & { _tokens: CallTokens }> {
  const system = `You are an experienced real estate inspector. Analyze the property photos and any agent notes provided.
Return ONLY valid JSON — no markdown, no explanation — with this exact schema:
{
  "score": <integer 1–10>,
  "summary": "<string>",
  "lineItems": [{ "category": "<string>", "notes": "<string>" }]
}

Describe what you observe in each visible area: kitchen, bathrooms, flooring, HVAC, roof, exterior, and any other notable areas.
Do NOT assign a repair tier or estimate costs — only provide qualitative observations.
score is an overall condition score from 1 (severely distressed) to 10 (fully renovated/like new).

IMPORTANT — data conflicts: The property details (beds, baths, sqft, year built, condition grade, etc.) come from public records which are often inaccurate. If the agent notes provide different values for any of these fields, always trust and use the agent notes over the public records data. Reflect the agent-provided information in your assessment.`;

  let imageBlocks: Anthropic.ImageBlockParam[];
  let photoSource: string;

  if (uploadedPhotos && uploadedPhotos.length > 0) {
    imageBlocks = uploadedPhotos.map((photo) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: photo.mediaType,
        data: photo.data,
      },
    }));
    photoSource = `user-uploaded (${imageBlocks.length} photos)`;
  } else {
    imageBlocks = (
      await Promise.all(
        property.photos.map(async (url) => {
          const source = await fetchImageAsBase64(url);
          if (!source) return null;
          return { type: "image" as const, source } as Anthropic.ImageBlockParam;
        })
      )
    ).filter((b) => b !== null) as Anthropic.ImageBlockParam[];
    photoSource = `axesso (${imageBlocks.length} of ${property.photos.length} urls)`;
  }

  const textBlock1: Anthropic.TextBlockParam = {
    type: "text",
    text: `Address: ${property.address}\nBeds: ${property.beds} | Baths: ${property.baths} | Sqft: ${property.sqft}\nYear built: ${property.yearBuilt} | Type: ${property.propertyType}`,
  };
  const textBlock2: Anthropic.TextBlockParam = {
    type: "text",
    text: `The agent has assessed this property as: ${conditionGrade} condition.\nValidate this assessment based on what you see in the photos. If you observe something significantly different, flag it clearly.${property.notes ? `\n\nAgent notes: ${property.notes}` : ""}\n\nReturn JSON only.`,
  };

  const userContent: Anthropic.MessageParam["content"] = [
    textBlock1,
    ...imageBlocks,
    textBlock2,
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const text = (response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined)?.text;
  console.log(`[CALL 1] stop=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens}`);

  const parsed = JSON.parse(extractJSON(text, "Call 1 (condition)")) as { score: number; summary: string; lineItems: { category: string; notes: string }[] };

  return { score: parsed.score, summary: parsed.summary, lineItems: parsed.lineItems, _tokens: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE CALL 2  (STEP 8)
// ─────────────────────────────────────────────────────────────────────────────
export async function validateAndCategorizeComps(
  comps: NormalizedComp[],
  subject: PropertyDetails,
  conditionGrade: ConditionGrade
): Promise<CompValidation & { _tokens: CallTokens }> {
  const system = `You are a senior real estate appraiser. Categorize each comparable property provided.
Note: these comps are nearby listings (list prices), not confirmed closed sales — weigh stale or inactive listings accordingly (see below).
Return ONLY valid JSON — no markdown, no explanation — with this exact schema:
{
  "validatedComps": [{ "compIndex": <integer>, "category": "arv" | "turnkey" | "as_is" }],
  "rejectedComps": [{ "compIndex": <integer>, "reason": "<string>" }],
  "analystNotes": "<string>"
}

compIndex is the Comp # number shown in the input (1-based).

Category definitions:
- arv: renovated/updated property — good comparable for post-repair ARV
- turnkey: move-in ready but not fully renovated
- as_is: distressed/unrepaired condition

Reject ONLY if: (1) the comp's property type does not match the subject property type, or (2) the list price is unrealistically far from the subject's expected value range — e.g. a $50K listing next to $300K comps, or a $1.2M listing in a $200K neighborhood. Do not reject based on distance, foreclosure/REO status, or merely being an active listing.

Use status and days-on-market as judgment signals, not rejection criteria: a listing sitting active for 90+ days at its price suggests the price may be aspirational rather than market-supported — note this in analystNotes rather than rejecting it outright, so the ARV step downstream can weigh it appropriately.`;

  const subjectBlock: Anthropic.TextBlockParam = {
    type: "text",
    text: `Subject: ${subject.address} | ${subject.beds}bd/${subject.baths}ba | ${subject.sqft} sqft | Built ${subject.yearBuilt} | ${subject.propertyType}\nSubject condition (user selected): ${conditionGrade}\nContext: This property needs comps that reflect its POST-REPAIR value. ARV comps must be fully renovated properties — not just move-in ready.${subject.notes ? `\nAgent notes: ${subject.notes}` : ""}\n\nCategorize each comp below.`,
  };

  const compBlockArrays = await Promise.all(
    comps.map(async (c, i) => {
      const textBlock: Anthropic.TextBlockParam = {
        type: "text",
        text: `Comp #${i + 1}: ${c.address} | list price $${c.salePrice.toLocaleString()} | $${Math.round(c.pricePerSqft)}/sqft | ${c.sqft} sqft | ${c.beds}bd/${c.baths}ba${c.listingStatus ? ` | status: ${c.listingStatus}` : ""}${c.daysOnMarket != null ? ` | ${c.daysOnMarket} days on market` : ""}${c.correlation != null ? ` | similarity: ${c.correlation.toFixed(2)}` : ""}`,
      };
      const photoBlocks = (
        await Promise.all(
          c.photos.map(async (url) => {
            const source = await fetchImageAsBase64(url);
            if (!source) return null;
            return { type: "image" as const, source } as Anthropic.ImageBlockParam;
          })
        )
      ).filter((b) => b !== null) as Anthropic.ImageBlockParam[];
      return [textBlock, ...photoBlocks] as Anthropic.ContentBlockParam[];
    })
  );
  const compBlocks = compBlockArrays.flat();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: [subjectBlock, ...compBlocks] }],
  });

  const text = (response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined)?.text;
  console.log(`[CALL 2] stop=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens}`);

  const parsed = JSON.parse(extractJSON(text, "Call 2 (comps)")) as {
    validatedComps: { compIndex: number; category: CompCategory }[];
    rejectedComps: { compIndex: number; reason: string }[];
    analystNotes: string;
  };

  const rejectedIndices = new Set(parsed.rejectedComps.map((r) => r.compIndex));

  const validatedComps: NormalizedComp[] = comps
    .map((c, i) => {
      const compIndex = i + 1;
      if (rejectedIndices.has(compIndex)) return null;
      const match = parsed.validatedComps.find((v) => v.compIndex === compIndex);
      return { ...c, category: match?.category ?? null };
    })
    .filter((c): c is NormalizedComp => c !== null);

  return {
    validatedComps,
    rejectedComps: parsed.rejectedComps,
    analystNotes: parsed.analystNotes,
    _tokens: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE CALL 3  (STEP 9) — ARV synthesis: merges RentCast's AVM with arv comps
// ─────────────────────────────────────────────────────────────────────────────
export async function synthesizeARV(
  input: ArvSynthesisInput
): Promise<ArvSynthesisResult & { _tokens: CallTokens }> {
  const system = `You are a senior real estate appraiser determining the after-repair value (ARV) of a property.

You have two signals:
1. An automated valuation model (AVM) estimate from RentCast — a statistical estimate based on broad market data.
2. A set of nearby comparable properties already categorized as "arv" comps (renovated/updated properties, good references for post-repair value) — each with a list price, $/sqft, days on market, and a similarity score.

Weigh both signals to produce a final ARV. Comps that are recent, close in distance, highly similar, and not sitting stale on the market deserve more weight than the AVM. If comps are sparse, low-similarity, or have been listed 90+ days without selling (suggesting an aspirational price), lean more heavily on the AVM instead. If there are no arv comps at all, rely on the AVM and say so plainly.

Return ONLY valid JSON — no markdown, no explanation — with this exact schema:
{
  "arv": <number>,
  "arvLow": <number>,
  "arvHigh": <number>,
  "reasoning": "<string>"
}

arvLow/arvHigh should bracket your confidence range — tighter than the AVM's own range if the comps strongly agree with each other and with the AVM, wider if the signals disagree.
reasoning should be 2-3 sentences explaining how you weighed the AVM against the comps — this will be shown directly in the underwriting report's market narrative, so write it for a real estate investor audience, not a developer.`;

  const bundle = {
    subjectAddress: input.property.address,
    subjectSqft: input.property.sqft,
    subjectBeds: input.property.beds,
    subjectBaths: input.property.baths,
    subjectYearBuilt: input.property.yearBuilt,
    subjectPropertyType: input.property.propertyType,
    subjectConditionScore: input.condition.score,
    rentcastAvm: input.rentcastAvm,
    arvComps: input.arvComps.map((c) => ({
      address: c.address,
      listPrice: c.salePrice,
      pricePerSqft: c.pricePerSqft,
      sqft: c.sqft,
      beds: c.beds,
      baths: c.baths,
      status: c.listingStatus,
      daysOnMarket: c.daysOnMarket,
      similarity: c.correlation,
    })),
  };

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: JSON.stringify(bundle) }],
  });

  const text = (response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined)?.text;
  console.log(`[CALL 3] stop=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens}`);

  const parsed = JSON.parse(extractJSON(text, "Call 3 (ARV)")) as {
    arv: number;
    arvLow: number;
    arvHigh: number;
    reasoning: string;
  };

  return {
    arv: parsed.arv,
    arvLow: parsed.arvLow,
    arvHigh: parsed.arvHigh,
    reasoning: parsed.reasoning,
    _tokens: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE CALL 4  (STEP 11)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateUnderwritingReport(
  input: ReportGenerationInput
): Promise<UnderwritingReport & { _tokens: CallTokens }> {
  const system = `You are a senior underwriter at a real estate investment firm. Synthesize the deal data and generate a comprehensive underwriting narrative.
Return ONLY valid JSON — no markdown, no explanation — with this exact schema:
{
  "executiveSummary": "<string>",
  "propertyNarrative": "<string>",
  "marketNarrative": "<string>",
  "redFlags": ["<string>"],
  "greenFlags": ["<string>"],
  "recommendation": "pursue" | "negotiate" | "pass",
  "confidenceScore": <integer 1–10>,
  "additionalFlags": ["<string>"]
}

Recommendation criteria:
- pursue: max offer covers repairs + investor profit with comfortable margin
- negotiate: deal works but offer needs to come down or numbers are tight
- pass: deal does not work at current numbers or risk is too high

Investor profit minimums:
- ARV above $500k → $50,000 minimum
- ARV $350k–$500k → $40,000 minimum
- ARV below $350k → $30,000 minimum

Always flag if any of the following are present:
no central HVAC, aluminum windows, no permits pulled, tenant occupied, public records sqft differs from actual sqft, foundation issues, comps located outside the immediate neighborhood.

If the workflow flags include "arv_zestimate_fallback": the ARV is based solely on the Zestimate, not the comps or AVM. Make this prominent in your executiveSummary and propertyNarrative. Lower your confidenceScore accordingly (cap at 5) and flag this as a red flag. Recommend "negotiate" or "pass" unless the numbers are exceptionally strong.
If the workflow flags include "arv_unavailable": no comps, AVM estimate, or Zestimate were available. ARV cannot be determined. Set confidenceScore to 1, recommendation to "pass", and make clear in executiveSummary that the deal cannot be underwritten without ARV data. Focus your assessment on the property condition only.`;

  const arvComps = input.validatedComps.filter((c) => c.category === "arv");
  const turnkeyComps = input.validatedComps.filter((c) => c.category === "turnkey");
  const asIsComps = input.validatedComps.filter((c) => c.category === "as_is");

  const bundle = {
    property: input.property,
    conditionGrade: input.conditionGrade,
    marketMultiplier: input.marketMultiplier,
    condition: input.condition,
    repairs: input.repairs,
    arv: input.arv,
    financials: input.financials,
    arvComps,
    turnkeyComps,
    asIsComps,
    flags: input.flags,
    ...(input.property.notes ? { agentNotes: input.property.notes } : {}),
  };

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: JSON.stringify(bundle) }],
  });

  const text = (response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined)?.text;
  console.log(`[CALL 4] stop=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens}`);

  const claudeOutput = JSON.parse(extractJSON(text, "Call 4 (report)")) as {
    executiveSummary: string;
    propertyNarrative: string;
    marketNarrative: string;
    redFlags: string[];
    greenFlags: string[];
    recommendation: DealRecommendation;
    confidenceScore: number;
    additionalFlags?: string[];
  };

  const finalReport: UnderwritingReport = {
    address: input.property.address,
    generatedAt: new Date().toISOString(),
    property: input.property,
    comps: input.validatedComps,
    condition: input.condition,
    repairs: input.repairs,
    arv: input.arv,
    financials: input.financials,
    flags: [...input.flags, ...(claudeOutput.additionalFlags ?? [])],
    executiveSummary: claudeOutput.executiveSummary,
    propertyNarrative: claudeOutput.propertyNarrative,
    marketNarrative: claudeOutput.marketNarrative,
    redFlags: claudeOutput.redFlags,
    greenFlags: claudeOutput.greenFlags,
    recommendation: claudeOutput.recommendation,
    confidenceScore: claudeOutput.confidenceScore,
  };

  return { ...finalReport, _tokens: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } };
}
