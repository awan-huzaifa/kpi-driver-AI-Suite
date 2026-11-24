import type { NormalizedComp } from "@/lib/underwriting/types";

const API_KEY  = process.env.INVESTOR_BASE_KEY!;
const BASE_URL = "https://api.investorbase.com/v1";

const defaultHeaders = {
  "x-api-key": API_KEY,
  "Content-Type": "application/json",
};

// ─────────────────────────────────────────────────────────────────────────────
// /v1/retail-comps — closed sale comps for ARV cross-validation.
// Second independent source alongside RentCast.
// Photos are NOT returned — resolved later via Axesso fetchPhotosByAddress.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchRetailComps(
  address: string,
  options: {
    maxRadiusMiles?: number;
    maxDaysBack?: number;
    bedsMin?: number;
    bedsMax?: number;
    sqftMin?: number;
    sqftMax?: number;
  } = {}
): Promise<NormalizedComp[]> {
  console.log("\n" + "═".repeat(60));
  console.log("INVESTORBASE — fetchRetailComps");
  console.log("═".repeat(60));
  console.log("[IB fetchRetailComps] INPUT address:", address);
  console.log("[IB fetchRetailComps] OPTIONS:", JSON.stringify(options));

  const body = {
    address,
    max_radius_miles:       options.maxRadiusMiles  ?? 2,
    max_days_back:          options.maxDaysBack     ?? 180,
    bedrooms_min:           options.bedsMin         ?? null,
    bedrooms_max:           options.bedsMax         ?? null,
    living_square_feet_min: options.sqftMin         ?? null,
    living_square_feet_max: options.sqftMax         ?? null,
  };

  console.log("[IB fetchRetailComps] REQUEST BODY:", JSON.stringify(body, null, 2));

  const res = await fetch(`${BASE_URL}/retail-comps`, {
    method:  "POST",
    headers: defaultHeaders,
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[IB fetchRetailComps] FAILED:", res.status, res.statusText, text);
    throw new Error(`InvestorBase retail-comps failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    subject?: unknown;
    comps?: {
      address: string;
      city: string;
      state: string;
      zip: string;
      bedrooms: number;
      bathrooms: number;
      living_square_feet: number;
      lot_square_feet: number;
      last_sale_date: string | null;
      last_sale_amount: number;
      distance: number;
      latitude: number;
      longitude: number;
    }[];
  };

  console.log("[IB fetchRetailComps] RAW RESPONSE:", JSON.stringify(data, null, 2));

  const rawComps = data.comps ?? [];
  console.log("[IB fetchRetailComps] TOTAL COMPS:", rawComps.length);

  const comps: NormalizedComp[] = rawComps
    .filter(c => c.last_sale_amount > 0 && c.living_square_feet > 0)
    .map((c, i) => {
      const pricePerSqft = Math.round(c.last_sale_amount / c.living_square_feet);
      const comp: NormalizedComp = {
        address:      `${c.address}, ${c.city}, ${c.state} ${c.zip}`,
        salePrice:    c.last_sale_amount,
        saleDate:     c.last_sale_date ?? "",
        sqft:         c.living_square_feet,
        lotSizeSqft:  c.lot_square_feet || undefined,
        pricePerSqft,
        beds:         c.bedrooms,
        baths:        c.bathrooms,
        photos:       [],  // resolved later via Axesso
        category:     null,
      };
      console.log(`[IB fetchRetailComps] COMP #${i + 1}:`, {
        address:      comp.address,
        salePrice:    comp.salePrice,
        pricePerSqft: comp.pricePerSqft,
        sqft:         comp.sqft,
        beds:         comp.beds,
        baths:        comp.baths,
        saleDate:     comp.saleDate,
        distanceMi:   c.distance,
      });
      return comp;
    });

  console.log("[IB fetchRetailComps] NORMALIZED COMPS:", comps.length, "(filtered out", rawComps.length - comps.length, "with missing price/sqft)");
  return comps;
}

// ─────────────────────────────────────────────────────────────────────────────
// /v1/investor-comps — what investors (flippers + landlords) actually paid
// to acquire nearby properties. Used to validate the max offer against real
// investor buy prices in the market.
// Photos are NOT returned — resolved later via Axesso fetchPhotosByAddress.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchInvestorComps(
  latitude: number,
  longitude: number,
  subjectDetails: { beds?: number; baths?: number; sqft?: number } = {}
): Promise<NormalizedComp[]> {
  console.log("\n" + "═".repeat(60));
  console.log("INVESTORBASE — fetchInvestorComps");
  console.log("═".repeat(60));
  console.log("[IB fetchInvestorComps] INPUT lat:", latitude, "lng:", longitude);
  console.log("[IB fetchInvestorComps] SUBJECT DETAILS:", JSON.stringify(subjectDetails));

  const body = {
    latitude,
    longitude,
    property_types:          ["SFR"],
    subject_property_details: {
      bedrooms:    subjectDetails.beds   ?? undefined,
      bathrooms:   subjectDetails.baths  ?? undefined,
      square_feet: subjectDetails.sqft   ?? undefined,
    },
  };

  console.log("[IB fetchInvestorComps] REQUEST BODY:", JSON.stringify(body, null, 2));

  const res = await fetch(`${BASE_URL}/investor-comps`, {
    method:  "POST",
    headers: defaultHeaders,
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[IB fetchInvestorComps] FAILED:", res.status, res.statusText, text);
    throw new Error(`InvestorBase investor-comps failed: ${res.status} ${res.statusText}`);
  }

  const rawComps = (await res.json()) as {
    buyer_type: "flipper" | "landlord";
    address: string;
    bedrooms: number;
    bathrooms: number;
    livingsquarefeet: number;
    lotsquarefeet: number;
    propertytype: string;
    latitude: number;
    longitude: number;
    miles_from_subject: number;
    flip_purchase_transaction_date: string | null;
    flip_purchase_transaction_price: number | null;
    flip_sale_transaction_date: string | null;
    flip_sale_transaction_price: number | null;
    rental_purchase_transaction_date: string | null;
    rental_purchase_transaction_price: number | null;
    rank?: number;
    pricePerSqFt?: number;
  }[];

  console.log("[IB fetchInvestorComps] RAW RESPONSE:", JSON.stringify(rawComps, null, 2));
  console.log("[IB fetchInvestorComps] TOTAL RESULTS:", rawComps.length);

  const comps: NormalizedComp[] = rawComps
    .filter(c => {
      const price = c.flip_purchase_transaction_price ?? c.rental_purchase_transaction_price;
      return price != null && price > 0 && c.livingsquarefeet > 0;
    })
    .map((c, i) => {
      // Use buy price (what investor paid), not the sale/flip price
      const buyPrice  = (c.flip_purchase_transaction_price ?? c.rental_purchase_transaction_price)!;
      const buyDate   = c.flip_purchase_transaction_date ?? c.rental_purchase_transaction_date ?? "";
      const pricePerSqft = Math.round(buyPrice / c.livingsquarefeet);

      const comp: NormalizedComp = {
        address:      c.address,
        salePrice:    buyPrice,
        saleDate:     buyDate,
        sqft:         c.livingsquarefeet,
        lotSizeSqft:  c.lotsquarefeet || undefined,
        pricePerSqft,
        beds:         c.bedrooms,
        baths:        c.bathrooms,
        photos:       [],  // resolved later via Axesso
        category:     null,
      };
      console.log(`[IB fetchInvestorComps] COMP #${i + 1}:`, {
        address:      comp.address,
        buyerType:    c.buyer_type,
        buyPrice:     comp.salePrice,
        pricePerSqft: comp.pricePerSqft,
        sqft:         comp.sqft,
        beds:         comp.beds,
        baths:        comp.baths,
        buyDate:      comp.saleDate,
        distanceMi:   c.miles_from_subject,
        rank:         c.rank,
        flipSalePrice: c.flip_sale_transaction_price,
      });
      return comp;
    });

  console.log("[IB fetchInvestorComps] NORMALIZED COMPS:", comps.length, "(filtered out", rawComps.length - comps.length, "with missing price/sqft)");
  return comps;
}
