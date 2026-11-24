import type { PropertyDetails } from "@/lib/underwriting/types";

const API_KEY = process.env.AXESSO_API_KEY!;
const BASE_URL = "https://api.axesso.de/zil";

const defaultHeaders = {
  "axesso-api-key": API_KEY,
  "Cache-Control": "no-cache",
};

// Axesso returns lot size in acres for some properties and sqft for others.
// Values < 100 are treated as acres and converted; >= 100 are already sqft.
function normalizeLotSize(value: number | null | undefined): number | undefined {
  if (!value || value <= 0) return undefined;
  return value < 100 ? Math.round(value * 43_560) : Math.round(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 helper
// ─────────────────────────────────────────────────────────────────────────────
export async function searchProperty(address: string): Promise<PropertyDetails> {
  const url = new URL(`${BASE_URL}/search-by-address`);
  url.searchParams.set("address", address);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: defaultHeaders,
  });

  if (!res.ok) {
    throw new Error(`Axesso searchProperty failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const property: PropertyDetails = {
    zpid: data.zpid,
    listingType: data.adTargets?.listtp,
    address: data.address?.streetAddress,
    city: data.adTargets?.city,
    state: data.adTargets?.state,
    zip: data.adTargets?.zip,
    beds: Number(data.adTargets?.bd),
    baths: Number(data.adTargets?.ba),
    sqft: Number(data.adTargets?.sqft),
    lotSizeSqft: normalizeLotSize(data.resoFacts?.lotSize),
    yearBuilt: data.resoFacts?.yearBuilt,
    propertyType: data.homeType || data.adTargets?.proptp,
    constructionMaterials: data.resoFacts?.constructionMaterials ?? [],
    cooling: data.resoFacts?.cooling ?? [],
    heating: data.resoFacts?.heating ?? [],
    flooring: data.resoFacts?.flooring ?? [],
    roofType: data.resoFacts?.roofType ?? null,
    stories: data.resoFacts?.stories ?? null,
    hasPrivatePool: data.resoFacts?.hasPrivatePool ?? false,
    hasGarage: data.resoFacts?.hasGarage ?? data.resoFacts?.hasAttachedGarage ?? false,
    hasOffStreetParking: data.resoFacts?.hasOpenParking ?? false,
    homeStatus: data.homeStatus,
    daysOnZillow: data.daysOnZillow ?? null,
    priceHistory: (data.priceHistory ?? []).map((item: any) => ({
      date: item.date,
      price: item.price,
      pricePerSqft: item.pricePerSquareFoot,
      event: item.event,
    })),
    isBankOwned: data.foreclosureTypes?.isBankOwned ?? false,
    isPreforeclosure: data.foreclosureTypes?.isPreforeclosure ?? false,
    isAnyForeclosure: data.foreclosureTypes?.isAnyForeclosure ?? false,
    isFSBO: data.listing_sub_type?.is_FSBO ?? false,
    taxAssessedValue: data.resoFacts?.taxAssessedValue ?? null,
    zestimate: Number(data.adTargets?.zestimate) || null,
    lastSalePrice: null,
    lastSaleDate: null,
    photos: data.originalPhotos?.map((p: any) => p.mixedSources?.jpeg?.[0]?.url ?? p.url).filter(Boolean).slice(0, 10) ?? [],
    neighborhood: data.address?.neighborhood ?? data.adTargets?.hood,
    subdivision: data.address?.subdivision ?? null,
    latitude:  data.latitude  ?? data.location?.latitude  ?? null,
    longitude: data.longitude ?? data.location?.longitude ?? null,
  };

  return property;
}

// ─── fetchPropertyPhotos (private helper) ─────────────────────────────────────
async function fetchPropertyPhotos(zpid: string): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/photos?zpid=${zpid}`, { headers: defaultHeaders });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos ?? [])
      .map((photo: any) => photo.mixedSources?.jpeg?.[0]?.url)
      .filter(Boolean)
      .slice(0, 10);
  } catch {
    return [];
  }
}

// ─── fetchPhotosByAddress — resolve photos for a RentCast comp ───────────────
// RentCast comps come back with no photos and no zpid. This does the 2-hop
// lookup: address → zpid (via searchProperty) → photos (via fetchPropertyPhotos).
export async function fetchPhotosByAddress(address: string): Promise<string[]> {
  try {
    const property = await searchProperty(address);
    if (!property.zpid) return [];
    return await fetchPropertyPhotos(String(property.zpid));
  } catch {
    return [];
  }
}

