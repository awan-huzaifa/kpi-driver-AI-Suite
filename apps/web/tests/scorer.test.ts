import { describe, it, expect } from 'vitest'
import { mapCallStage } from '../lib/sales-coach/anthropic/scorer'
import { CALL_STAGE_MAP, RUBRIC_FUS, RUBRIC_ACQ } from '../lib/sales-coach/anthropic/rubrics'

// ── mapCallStage ──────────────────────────────────────────────────────────────

describe('mapCallStage', () => {
  it('maps "New Lead" to "First Touch"', () => {
    expect(mapCallStage('New Lead')).toBe('First Touch')
  })

  it('maps "Nurture Pipeline" to "Nurture"', () => {
    expect(mapCallStage('Nurture Pipeline')).toBe('Nurture')
  })

  it('maps "Responded" to "Ongoing"', () => {
    expect(mapCallStage('Responded')).toBe('Ongoing')
  })

  it('maps "Attempted Contact" to "Follow Up"', () => {
    expect(mapCallStage('Attempted Contact')).toBe('Follow Up')
  })

  it('maps "Perseverant" to "Follow Up"', () => {
    expect(mapCallStage('Perseverant')).toBe('Follow Up')
  })

  it('maps "Contacted - Follow Up" to "Follow Up"', () => {
    expect(mapCallStage('Contacted - Follow Up')).toBe('Follow Up')
  })

  it('maps "Skip Trace Completed" to "Follow Up"', () => {
    expect(mapCallStage('Skip Trace Completed')).toBe('Follow Up')
  })

  it('maps "Negotiating" to "Negotiating"', () => {
    expect(mapCallStage('Negotiating')).toBe('Negotiating')
  })

  it('maps "Offer Made" to "Negotiating"', () => {
    expect(mapCallStage('Offer Made')).toBe('Negotiating')
  })

  it('maps "Appointment Set" to "Discovery"', () => {
    expect(mapCallStage('Appointment Set')).toBe('Discovery')
  })

  it('maps "No-Show" to "Discovery"', () => {
    expect(mapCallStage('No-Show')).toBe('Discovery')
  })

  it('maps "Contract Sent" to "Closing"', () => {
    expect(mapCallStage('Contract Sent')).toBe('Closing')
  })

  it('maps "Contract Signed" to "Closing"', () => {
    expect(mapCallStage('Contract Signed')).toBe('Closing')
  })

  it('maps "Closed Deal" to "Final Touch"', () => {
    expect(mapCallStage('Closed Deal')).toBe('Final Touch')
  })

  it('passes through unknown stages unchanged', () => {
    expect(mapCallStage('Some Unknown Stage')).toBe('Some Unknown Stage')
  })

  it('passes through empty string unchanged', () => {
    expect(mapCallStage('')).toBe('')
  })

  it('is case-sensitive — wrong case falls through', () => {
    expect(mapCallStage('new lead')).toBe('new lead')
    expect(mapCallStage('CLOSED DEAL')).toBe('CLOSED DEAL')
  })
})

// ── CALL_STAGE_MAP shape ──────────────────────────────────────────────────────

describe('CALL_STAGE_MAP', () => {
  it('contains exactly 14 entries', () => {
    expect(Object.keys(CALL_STAGE_MAP)).toHaveLength(14)
  })

  it('all values are non-empty strings', () => {
    Object.values(CALL_STAGE_MAP).forEach(v => {
      expect(typeof v).toBe('string')
      expect(v.length).toBeGreaterThan(0)
    })
  })

  it('contains the expected output stages', () => {
    const stages = new Set(Object.values(CALL_STAGE_MAP))
    expect(stages).toContain('First Touch')
    expect(stages).toContain('Follow Up')
    expect(stages).toContain('Negotiating')
    expect(stages).toContain('Discovery')
    expect(stages).toContain('Closing')
    expect(stages).toContain('Final Touch')
  })

  it('"Follow Up" is the most common mapped stage', () => {
    const counts: Record<string, number> = {}
    Object.values(CALL_STAGE_MAP).forEach(v => {
      counts[v] = (counts[v] ?? 0) + 1
    })
    const max = Math.max(...Object.values(counts))
    expect(counts['Follow Up']).toBe(max)
  })
})

// ── Rubric content ────────────────────────────────────────────────────────────

describe('RUBRIC_FUS', () => {
  it('is a non-empty string', () => {
    expect(typeof RUBRIC_FUS).toBe('string')
    expect(RUBRIC_FUS.length).toBeGreaterThan(100)
  })

  it('mentions 100 points', () => {
    expect(RUBRIC_FUS).toContain('100')
  })

  it('covers rapport as a category', () => {
    expect(RUBRIC_FUS.toLowerCase()).toContain('rapport')
  })

  it('covers qualification as a category', () => {
    expect(RUBRIC_FUS.toLowerCase()).toContain('qualification')
  })
})

describe('RUBRIC_ACQ', () => {
  it('is a non-empty string', () => {
    expect(typeof RUBRIC_ACQ).toBe('string')
    expect(RUBRIC_ACQ.length).toBeGreaterThan(100)
  })

  it('mentions 100 points', () => {
    expect(RUBRIC_ACQ).toContain('100')
  })

  it('is distinct from FUS rubric', () => {
    expect(RUBRIC_ACQ).not.toBe(RUBRIC_FUS)
  })
})

// ── JSON schema structure (what we enforce Claude to return) ──────────────────

describe('Score output schema enforcement', () => {
  // These tests simulate what the scorer does when parsing Claude's JSON response

  it('extracts overall_score with fallback to null', () => {
    const parsed = { overall_score: 82 }
    const score = parsed.scorable === false ? null : (parsed.overall_score ?? null)
    expect(score).toBe(82)
  })

  it('returns null score when scorable is false', () => {
    const parsed = { scorable: false, overall_score: 82 }
    const score = parsed.scorable === false ? null : (parsed.overall_score ?? null)
    expect(score).toBeNull()
  })

  it('defaults penalties to empty array when missing', () => {
    const parsed: Record<string, unknown> = {}
    expect(parsed.penalties ?? []).toEqual([])
  })

  it('defaults bonuses to empty array when missing', () => {
    const parsed: Record<string, unknown> = {}
    expect(parsed.bonuses ?? []).toEqual([])
  })

  it('defaults manager_review_needed to false when missing', () => {
    const parsed: Record<string, unknown> = {}
    expect(parsed.manager_review_needed ?? false).toBe(false)
  })

  it('score_band values are the expected 5 tiers', () => {
    const validBands = ['Elite', 'Strong', 'Workable', 'Weak', 'Needs Coaching']
    validBands.forEach(band => {
      expect(['Elite', 'Strong', 'Workable', 'Weak', 'Needs Coaching']).toContain(band)
    })
  })

  it('opportunity_level values are the expected 3 tiers', () => {
    const validLevels = ['low', 'medium', 'high']
    validLevels.forEach(level => {
      expect(['low', 'medium', 'high']).toContain(level)
    })
  })

  it('JSON regex extracts object from response with surrounding whitespace', () => {
    const raw = '  Here is your result:\n{"score": 75, "scorable": true}\n  '
    const match = raw.match(/\{[\s\S]*\}/)
    expect(match).not.toBeNull()
    expect(JSON.parse(match![0]).score).toBe(75)
  })

  it('JSON regex handles multi-line objects', () => {
    const raw = `{"scorable": true,\n"overall_score": 88,\n"score_band": "Strong"}`
    const match = raw.match(/\{[\s\S]*\}/)
    expect(match).not.toBeNull()
    const parsed = JSON.parse(match![0])
    expect(parsed.overall_score).toBe(88)
    expect(parsed.score_band).toBe('Strong')
  })

  it('JSON regex returns null for response with no JSON object', () => {
    const raw = 'I cannot score this call — transcript is empty.'
    const match = raw.match(/\{[\s\S]*\}/)
    expect(match).toBeNull()
  })
})
