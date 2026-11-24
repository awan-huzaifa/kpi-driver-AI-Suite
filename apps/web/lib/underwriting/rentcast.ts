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

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: defaultHeaders,
  });

  if (!res.ok) {
    throw new Error(`RentCast searchComps failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as RentCastAvmResponse;

  const avm = {
    value: data.price,
    low: data.priceRangeLow,
    high: data.priceRangeHigh,
  };

  const comparables = data.comparables ?? [];

  const comps: NormalizedComp[] = comparables.map((c) => {
    const pricePerSqft = c.squareFootage > 0 ? Math.round(c.price / c.squareFootage) : 0;
    return {
      address: c.formattedAddress,
      salePrice: c.price,
      saleDate: c.listedDate ?? "",
      sqft: c.squareFootage,
      lotSizeSqft: c.lotSize ?? undefined,
      pricePerSqft,
      beds: c.bedrooms,
      baths: c.bathrooms,
      photos: [],
      listingStatus: c.status,
      daysOnMarket: c.daysOnMarket,
      correlation: c.correlation,
      category: null,
    };
  });

  return { avm, comps };
}
