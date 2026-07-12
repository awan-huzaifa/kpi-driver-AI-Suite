import type { RentCastAvmResponse, RentCastCompsResult, NormalizedComp } from "@/lib/underwriting/types";

const API_KEY = process.env.RENTCAST_API_KEY!;
const BASE_URL = "https://api.rentcast.io/v1";

const defaultHeaders = {
  "X-Api-Key": API_KEY,
  "accept": "application/json",
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — RentCast AVM: subject value estimate + nearby comps (list prices,
// not confirmed sales). Comps come back with no photos — those are resolved
// separately via Axesso (see fetchPhotosByAddress in axesso.ts).
// ─────────────────────────────────────────────────────────────────────────────
export async function searchComps(address: string, compCount = 5): Promise<RentCastCompsResult> {
  const url = new URL(`${BASE_URL}/avm/value`);
  url.searchParams.set("address", address);
  url.searchParams.set("compCount", String(compCount));

  console.log("\n" + "═".repeat(60));
  console.log("RENTCAST — searchComps");
  console.log("═".repeat(60));
  console.log("[RENTCAST searchComps] REQUEST URL:", url.toString());
  console.log("[RENTCAST searchComps] INPUT address:", address, "| compCount:", compCount);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: defaultHeaders,
  });

  if (!res.ok) {
    throw new Error(`RentCast searchComps failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as RentCastAvmResponse;
  console.log("[RENTCAST searchComps] RAW RESPONSE:", JSON.stringify(data, null, 2));

  const avm = {
    value: data.price,
    low: data.priceRangeLow,
    high: data.priceRangeHigh,
  };
  console.log("[RENTCAST searchComps] AVM ESTIMATE → value:", avm.value, "| low:", avm.low, "| high:", avm.high);

  const comparables = data.comparables ?? [];
  console.log("[RENTCAST searchComps] TOTAL COMPARABLES:", comparables.length);

  const comps: NormalizedComp[] = comparables.map((c) => {
    const pricePerSqft = c.squareFootage > 0 ? Math.round(c.price / c.squareFootage) : 0;
    return {
      address: c.formattedAddress,
      salePrice: c.price,           // list price — RentCast does not return confirmed sale data here
      saleDate: c.listedDate ?? "",
      sqft: c.squareFootage,
      lotSizeSqft: c.lotSize ?? undefined,
      pricePerSqft,
      beds: c.bedrooms,
      baths: c.bathrooms,
      photos: [],                   // filled in later via Axesso
      listingStatus: c.status,
      daysOnMarket: c.daysOnMarket,
      correlation: c.correlation,
      category: null,
    };
  });

  comps.forEach((c, i) => {
    console.log(`[RENTCAST searchComps] COMP #${i + 1}:`, {
      address: c.address,
      price: c.salePrice,
      pricePerSqft: c.pricePerSqft,
      sqft: c.sqft,
      beds: c.beds,
      baths: c.baths,
      status: c.listingStatus,
      daysOnMarket: c.daysOnMarket,
      correlation: c.correlation,
    });
  });

  return { avm, comps };
}
