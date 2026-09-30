import { describe, it, expect } from 'vitest'
import {
  calcRepairCostsKnown,
  calcRepairCostsScope,
  calcRepairCosts,
  calcARVAdjustments,
  calcMaxOffer,
  ARV_LOW_FACTOR,
  ARV_HIGH_FACTOR,
} from '../lib/underwriting/calculations'
import type { PropertyDetails } from '../lib/underwriting/types'

// Minimal PropertyDetails — only the fields calcARVAdjustments actually reads
function makeProperty(overrides: Partial<PropertyDetails>): PropertyDetails {
  return {
    zpid: 0, listingType: '', address: '', city: '', state: '', zip: '',
    beds: 0, baths: 0, sqft: 0, lotSizeSqft: undefined, yearBuilt: 0,
    propertyType: '', constructionMaterials: [], cooling: [], heating: [],
    flooring: [], roofType: null, stories: null,
    hasPrivatePool: false, hasGarage: false, hasOffStreetParking: false,
    homeStatus: '', daysOnZillow: null, priceHistory: [],
    isBankOwned: false, isPreforeclosure: false, isAnyForeclosure: false,
    isFSBO: false, photos: [], neighborhood: null, subdivision: null,
    zestimate: null, taxAssessedValue: null, lastSalePrice: null, lastSaleDate: null,
    ...overrides,
  }
}

// ── calcRepairCostsKnown ──────────────────────────────────────────────────────

describe('calcRepairCostsKnown', () => {
  it('sets low and high to the exact known cost', () => {
    const result = calcRepairCostsKnown(50_000)
    expect(result.low).toBe(50_000)
    expect(result.high).toBe(50_000)
  })

  it('works with zero cost', () => {
    const result = calcRepairCostsKnown(0)
    expect(result.low).toBe(0)
    expect(result.high).toBe(0)
  })

  it('sets extraItemsTotal to 0 regardless of input', () => {
    const result = calcRepairCostsKnown(99_999)
    expect(result.extraItemsTotal).toBe(0)
  })
})

// ── calcRepairCostsScope ──────────────────────────────────────────────────────

describe('calcRepairCostsScope', () => {
  it('sums all extra items correctly', () => {
    const items = [
      { label: 'Roof',     cost: 12_000, checked: true },
      { label: 'HVAC',     cost: 8_000,  checked: true },
      { label: 'Flooring', cost: 5_000,  checked: true },
    ]
    const result = calcRepairCostsScope('fair', items)
    expect(result.low).toBe(25_000)
    expect(result.high).toBe(25_000)
    expect(result.extraItemsTotal).toBe(25_000)
  })

  it('returns zero for empty items list', () => {
    const result = calcRepairCostsScope('good', [])
    expect(result.low).toBe(0)
    expect(result.high).toBe(0)
  })

  it('preserves item labels', () => {
    const result = calcRepairCostsScope('poor', [{ label: 'Roof', cost: 10_000, checked: true }])
    expect(result.checkedExtraItems[0].label).toBe('Roof')
  })
})

// ── calcRepairCosts (standard mode) ──────────────────────────────────────────

describe('calcRepairCosts', () => {
  it('calculates base cost correctly for fair condition', () => {
    // fair = $40–$50/sqft × 1000 sqft × 1.0 multiplier
    const result = calcRepairCosts('fair', 1_000, 1.0, [])
    expect(result.baseLow).toBe(40_000)
    expect(result.baseHigh).toBe(50_000)
  })

  it('applies market multiplier', () => {
    // poor = $55–$65/sqft × 1000 sqft × 1.2
    const result = calcRepairCosts('poor', 1_000, 1.2, [])
    expect(result.baseLow).toBe(66_000)
    expect(result.baseHigh).toBe(78_000)
  })

  it('adds checked extra items to base and excludes unchecked', () => {
    const extras = [
      { label: 'Roof',  cost: 10_000, checked: true  },
      { label: 'Paint', cost: 3_000,  checked: false },
    ]
    const result = calcRepairCosts('good', 1_000, 1.0, extras)
    // good = $25–$35k base + $10k checked extras
    expect(result.low).toBe(35_000)
    expect(result.high).toBe(45_000)
    expect(result.extraItemsTotal).toBe(10_000)
    expect(result.checkedExtraItems).toHaveLength(1)
  })

  it('uses customPerSqft when provided', () => {
    const result = calcRepairCosts('poor', 1_000, 1.0, [], 20)
    expect(result.per_sqft_low).toBe(20)
    expect(result.per_sqft_high).toBe(20)
    expect(result.baseLow).toBe(20_000)
  })
})

// ── calcARVAdjustments ────────────────────────────────────────────────────────

describe('calcARVAdjustments', () => {
  it('returns 0 when no premium features', () => {
    expect(calcARVAdjustments(makeProperty({ constructionMaterials: ['vinyl'] }))).toBe(0)
  })

  it('adds $30k for private pool', () => {
    expect(calcARVAdjustments(makeProperty({ hasPrivatePool: true }))).toBe(30_000)
  })

  it('adds $15k for garage', () => {
    expect(calcARVAdjustments(makeProperty({ hasGarage: true }))).toBe(15_000)
  })

  it('adds $10k for off-street parking', () => {
    expect(calcARVAdjustments(makeProperty({ hasOffStreetParking: true }))).toBe(10_000)
  })

  it('adds $17.5k for premium construction materials', () => {
    expect(calcARVAdjustments(makeProperty({ constructionMaterials: ['brick'] }))).toBe(17_500)
    expect(calcARVAdjustments(makeProperty({ constructionMaterials: ['concrete block'] }))).toBe(17_500)
    expect(calcARVAdjustments(makeProperty({ constructionMaterials: ['stone'] }))).toBe(17_500)
  })

  it('stacks all adjustments: brick + pool + garage + parking = $72.5k', () => {
    const result = calcARVAdjustments(makeProperty({
      constructionMaterials: ['brick'],
      hasPrivatePool: true,
      hasGarage: true,
      hasOffStreetParking: true,
    }))
    expect(result).toBe(72_500)
  })
})

// ── calcMaxOffer ──────────────────────────────────────────────────────────────

describe('calcMaxOffer', () => {
  const repairs = calcRepairCostsKnown(30_000)

  it('calculates netSalesPrice as 92% of ARV', () => {
    const result = calcMaxOffer(300_000, repairs)
    expect(result.netSalesPrice).toBeCloseTo(276_000)
  })

  it('default assignment fee is $22,500', () => {
    const result = calcMaxOffer(300_000, repairs)
    expect(result.assignmentFee).toBe(22_500)
  })

  it('higher investor profit % = lower max offer', () => {
    const r1 = calcMaxOffer(300_000, repairs, 0.10)
    const r2 = calcMaxOffer(300_000, repairs, 0.20)
    expect(r1.maxOfferLow).toBeGreaterThan(r2.maxOfferLow)
  })

  it('lower repair cost = higher max offer', () => {
    const cheap     = calcMaxOffer(300_000, calcRepairCostsKnown(10_000))
    const expensive = calcMaxOffer(300_000, calcRepairCostsKnown(50_000))
    expect(cheap.maxOfferLow).toBeGreaterThan(expensive.maxOfferLow)
  })

  it('maxOfferHigh > maxOfferLow when repair range has spread', () => {
    const varRepairs = calcRepairCosts('fair', 1_000, 1.0, [])
    const result = calcMaxOffer(300_000, varRepairs)
    expect(result.maxOfferHigh).toBeGreaterThan(result.maxOfferLow)
  })
})

// ── calcMaxOffer — extended ───────────────────────────────────────────────────

describe('calcMaxOffer — financial accuracy', () => {
  it('closing costs are 2% of ARV', () => {
    const result = calcMaxOffer(400_000, calcRepairCostsKnown(0))
    expect(result.closingCosts).toBeCloseTo(8_000)
  })

  it('realtor fees are 6% of ARV', () => {
    const result = calcMaxOffer(400_000, calcRepairCostsKnown(0))
    expect(result.realtorFees).toBeCloseTo(24_000)
  })

  it('investor profit is based on net sales price, not ARV', () => {
    const arv = 300_000
    const netSales = arv * 0.92  // 276,000
    const expectedProfit = netSales * 0.15
    const result = calcMaxOffer(arv, calcRepairCostsKnown(0), 0.15)
    expect(result.investorProfit).toBeCloseTo(expectedProfit)
  })

  it('zero repair cost produces max offer above ARV minus fees', () => {
    const result = calcMaxOffer(300_000, calcRepairCostsKnown(0))
    // With no repairs, maxOfferHigh should be reasonably high
    expect(result.maxOfferHigh).toBeGreaterThan(200_000)
  })

  it('high repair cost can make max offer negative', () => {
    // If repairs exceed net profit, max offer goes negative — this is a valid signal
    const result = calcMaxOffer(100_000, calcRepairCostsKnown(200_000))
    expect(result.maxOfferLow).toBeLessThan(0)
  })

  it('custom assignment fee overrides default $22,500', () => {
    const r1 = calcMaxOffer(300_000, calcRepairCostsKnown(30_000), 0.15, 10_000)
    const r2 = calcMaxOffer(300_000, calcRepairCostsKnown(30_000), 0.15, 22_500)
    expect(r1.maxOfferLow).toBeGreaterThan(r2.maxOfferLow)
    expect(r1.assignmentFee).toBe(10_000)
  })
})

// ── calcRepairCosts — edge cases ──────────────────────────────────────────────

describe('calcRepairCosts — edge cases', () => {
  it('excellent condition has $0 low per-sqft', () => {
    const result = calcRepairCosts('excellent', 2_000, 1.0, [])
    expect(result.baseLow).toBe(0)
  })

  it('excellent condition has $15 high per-sqft', () => {
    const result = calcRepairCosts('excellent', 2_000, 1.0, [])
    expect(result.baseHigh).toBe(30_000) // 2000 × 15
  })

  it('zero sqft produces zero base cost', () => {
    const result = calcRepairCosts('poor', 0, 1.0, [])
    expect(result.baseLow).toBe(0)
    expect(result.baseHigh).toBe(0)
  })

  it('multiplier of 0 produces zero base cost', () => {
    const result = calcRepairCosts('poor', 1_000, 0, [])
    expect(result.baseLow).toBe(0)
    expect(result.baseHigh).toBe(0)
  })

  it('low field = baseLow + extraItemsTotal', () => {
    const extras = [{ label: 'Windows', cost: 7_500, checked: true }]
    const result = calcRepairCosts('fair', 1_000, 1.0, extras)
    expect(result.low).toBe(result.baseLow + result.extraItemsTotal)
  })

  it('high field = baseHigh + extraItemsTotal', () => {
    const extras = [{ label: 'Windows', cost: 7_500, checked: true }]
    const result = calcRepairCosts('fair', 1_000, 1.0, extras)
    expect(result.high).toBe(result.baseHigh + result.extraItemsTotal)
  })

  it('stores condition and sqft on result', () => {
    const result = calcRepairCosts('good', 1_500, 1.1, [])
    expect(result.condition).toBe('good')
    expect(result.sqft).toBe(1_500)
    expect(result.marketMultiplier).toBe(1.1)
  })

  it('ignores customPerSqft of 0 and uses condition range', () => {
    const withZero   = calcRepairCosts('fair', 1_000, 1.0, [], 0)
    const withoutCustom = calcRepairCosts('fair', 1_000, 1.0, [])
    expect(withZero.baseLow).toBe(withoutCustom.baseLow)
  })
})

// ── ARV factors ───────────────────────────────────────────────────────────────

describe('ARV factors', () => {
  it('ARV_LOW_FACTOR is below 1 (conservative)', () => {
    expect(ARV_LOW_FACTOR).toBeLessThan(1)
  })

  it('ARV_HIGH_FACTOR is above 1 (optimistic)', () => {
    expect(ARV_HIGH_FACTOR).toBeGreaterThan(1)
  })

  it('ARV_LOW_FACTOR and HIGH_FACTOR are symmetric around 1', () => {
    expect(1 - ARV_LOW_FACTOR).toBeCloseTo(ARV_HIGH_FACTOR - 1)
  })

  it('applying ARV_LOW_FACTOR reduces value', () => {
    const arv = 300_000
    expect(arv * ARV_LOW_FACTOR).toBeLessThan(arv)
  })

  it('applying ARV_HIGH_FACTOR increases value', () => {
    const arv = 300_000
    expect(arv * ARV_HIGH_FACTOR).toBeGreaterThan(arv)
  })
})
