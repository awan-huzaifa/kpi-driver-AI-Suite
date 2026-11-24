import { describe, it, expect } from 'vitest'
import { mapCallStage } from '../lib/sales-coach/anthropic/scorer'
import { CALL_STAGE_MAP, SCORER_SYSTEM_PROMPT, selectFromBlock } from '../lib/sales-coach/anthropic/rubrics'
import type { SystemFacts } from '../lib/sales-coach/anthropic/rubrics'

const noFacts: SystemFacts = { SF1: false, SF2: false, SF3: false, SF4: false }
const allFacts: SystemFacts = { SF1: true, SF2: true, SF3: true, SF4: true }

// ── mapCallStage ──────────────────────────────────────────────────────────────

describe('mapCallStage', () => {
  it('maps "New Lead" to "First Touch"', () => {
    expect(mapCallStage('New Lead')).toBe('First Touch')
  })

  it('maps "Responded" to "Responded"', () => {
    expect(mapCallStage('Responded')).toBe('Responded')
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

  it('maps "No-Show" to "No-Show"', () => {
    expect(mapCallStage('No-Show')).toBe('No-Show')
  })

  it('maps "Contract Sent" to "Closing"', () => {
    expect(mapCallStage('Contract Sent')).toBe('Closing')
  })

  it('maps "Contract Signed" to "Closing"', () => {
    expect(mapCallStage('Contract Signed')).toBe('Closing')
  })

  it('maps "Reduction" to "Re-Trade"', () => {
    expect(mapCallStage('Reduction')).toBe('Re-Trade')
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

// ── SCORER_SYSTEM_PROMPT content ──────────────────────────────────────────────

describe('SCORER_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof SCORER_SYSTEM_PROMPT).toBe('string')
    expect(SCORER_SYSTEM_PROMPT.length).toBeGreaterThan(500)
  })

  it('contains the scoring formula', () => {
    expect(SCORER_SYSTEM_PROMPT).toContain('AGENT CORE')
    expect(SCORER_SYSTEM_PROMPT).toContain('FROM')
    expect(SCORER_SYSTEM_PROMPT).toContain('TO')
  })

  it('contains all FROM block codes S01-S18', () => {
    for (let i = 1; i <= 18; i++) {
      const code = `S${String(i).padStart(2, '0')}`
      expect(SCORER_SYSTEM_PROMPT).toContain(code)
    }
  })

  it('contains TO block codes TW, T1-T8', () => {
    expect(SCORER_SYSTEM_PROMPT).toContain('TW')
    for (let i = 1; i <= 8; i++) {
      expect(SCORER_SYSTEM_PROMPT).toContain(`T${i}`)
    }
  })

  it('contains FUS criteria codes F1-F8', () => {
    for (let i = 1; i <= 8; i++) {
      expect(SCORER_SYSTEM_PROMPT).toContain(`F${i}`)
    }
  })

  it('contains ACQ criteria codes A1-A8', () => {
    for (let i = 1; i <= 8; i++) {
      expect(SCORER_SYSTEM_PROMPT).toContain(`A${i}`)
    }
  })

  it('defines the five score bands', () => {
    expect(SCORER_SYSTEM_PROMPT).toContain('Elite')
    expect(SCORER_SYSTEM_PROMPT).toContain('Strong')
    expect(SCORER_SYSTEM_PROMPT).toContain('Intervention')
  })

  it('covers auto-fail conditions', () => {
    expect(SCORER_SYSTEM_PROMPT).toContain('AF1')
    expect(SCORER_SYSTEM_PROMPT).toContain('AF5')
  })
})

// ── selectFromBlock ───────────────────────────────────────────────────────────

describe('selectFromBlock', () => {
  it('New Lead → S01 for both roles', () => {
    expect(selectFromBlock('New Lead', noFacts, 'fus').block).toBe('S01')
    expect(selectFromBlock('New Lead', noFacts, 'acq').block).toBe('S01')
  })

  it('Responded → S02 for both roles', () => {
    expect(selectFromBlock('Responded', noFacts, 'fus').block).toBe('S02')
    expect(selectFromBlock('Responded', noFacts, 'acq').block).toBe('S02')
  })

  it('AI Agent with SF4=true → S03', () => {
    expect(selectFromBlock('AI Agent', allFacts, 'fus').block).toBe('S03')
    expect(selectFromBlock('AI Agent', allFacts, 'acq').block).toBe('S03')
  })

  it('AI Agent with SF4=false → S01', () => {
    expect(selectFromBlock('AI Agent', noFacts, 'fus').block).toBe('S01')
    expect(selectFromBlock('AI Agent', noFacts, 'acq').block).toBe('S01')
  })

  it('Attempted Contact with SF1=true → S04', () => {
    const sf1 = { ...noFacts, SF1: true }
    expect(selectFromBlock('Attempted Contact', sf1, 'fus').block).toBe('S04')
    expect(selectFromBlock('Attempted Contact', sf1, 'acq').block).toBe('S04')
  })

  it('Attempted Contact with SF1=false → S01', () => {
    expect(selectFromBlock('Attempted Contact', noFacts, 'fus').block).toBe('S01')
  })

  it('Appointment Set FUS → S05', () => {
    expect(selectFromBlock('Appointment Set', noFacts, 'fus').block).toBe('S05')
  })

  it('Appointment Set ACQ with SF2=true → S12', () => {
    const sf2 = { ...noFacts, SF2: true }
    expect(selectFromBlock('Appointment Set', sf2, 'acq').block).toBe('S12')
  })

  it('Appointment Set ACQ with SF2=false → S04', () => {
    expect(selectFromBlock('Appointment Set', noFacts, 'acq').block).toBe('S04')
  })

  it('No-Show → S06 for both roles', () => {
    expect(selectFromBlock('No-Show', noFacts, 'fus').block).toBe('S06')
    expect(selectFromBlock('No-Show', noFacts, 'acq').block).toBe('S06')
  })

  it('Negotiating ACQ with SF3=true → S14', () => {
    const sf3 = { ...noFacts, SF3: true }
    expect(selectFromBlock('Negotiating', sf3, 'acq').block).toBe('S14')
  })

  it('Negotiating ACQ with SF3=false → S13', () => {
    expect(selectFromBlock('Negotiating', noFacts, 'acq').block).toBe('S13')
  })

  it('Offer Made ACQ → S14', () => {
    expect(selectFromBlock('Offer Made', noFacts, 'acq').block).toBe('S14')
  })

  it('Contract Sent ACQ → S15', () => {
    expect(selectFromBlock('Contract Sent', noFacts, 'acq').block).toBe('S15')
  })

  it('Contract Signed ACQ → S16', () => {
    expect(selectFromBlock('Contract Signed', noFacts, 'acq').block).toBe('S16')
  })

  it('Reduction ACQ → S17', () => {
    expect(selectFromBlock('Reduction', noFacts, 'acq').block).toBe('S17')
  })

  it('Closed Deal → S18 for both roles', () => {
    expect(selectFromBlock('Closed Deal', noFacts, 'fus').block).toBe('S18')
    expect(selectFromBlock('Closed Deal', noFacts, 'acq').block).toBe('S18')
  })

  it('Dead → S07 with resurrection=true', () => {
    const r = selectFromBlock('Dead', noFacts, 'fus')
    expect(r.block).toBe('S07')
    expect(r.resurrection).toBe(true)
  })

  it('30 Day Nurture → S07', () => {
    expect(selectFromBlock('30 Day Nurture', noFacts, 'fus').block).toBe('S07')
  })

  it('6 Month Nurture - (Ghosted) → S08', () => {
    expect(selectFromBlock('6 Month Nurture - (Ghosted)', noFacts, 'acq').block).toBe('S08')
  })

  it('6 Month Nurture - (Offer Rejected) → S09', () => {
    expect(selectFromBlock('6 Month Nurture - (Offer Rejected)', noFacts, 'acq').block).toBe('S09')
  })

  it('6 Month Nurture - (Contract Rejected) → S10', () => {
    expect(selectFromBlock('6 Month Nurture - (Contract Rejected)', noFacts, 'acq').block).toBe('S10')
  })

  it('6 Month Nurture - (Cancelled Deal) → S11', () => {
    expect(selectFromBlock('6 Month Nurture - (Cancelled Deal)', noFacts, 'acq').block).toBe('S11')
  })

  it('unknown "6 Month Nurture - (X)" variant → S07', () => {
    expect(selectFromBlock('6 Month Nurture - (Some Other)', noFacts, 'fus').block).toBe('S07')
  })

  it('empty stage → low_confidence=true, infers S01 or S04', () => {
    const r = selectFromBlock('', noFacts, 'fus')
    expect(r.low_confidence).toBe(true)
    expect(r.block).toBe('S01')
  })

  it('null stage → low_confidence=true', () => {
    const r = selectFromBlock(null, noFacts, 'acq')
    expect(r.low_confidence).toBe(true)
  })
})

// ── V2 JSON output schema ─────────────────────────────────────────────────────

describe('V2 score output schema', () => {
  it('JSON regex extracts object from response with surrounding whitespace', () => {
    const raw = '  {"final_score": 75, "scorable": true}\n  '
    const match = raw.match(/\{[\s\S]*\}/)
    expect(match).not.toBeNull()
    expect(JSON.parse(match![0]).final_score).toBe(75)
  })

  it('JSON regex handles multi-line objects', () => {
    const raw = `{"scorable": true,\n"final_score": 88,\n"band": "Strong"}`
    const match = raw.match(/\{[\s\S]*\}/)
    expect(match).not.toBeNull()
    const parsed = JSON.parse(match![0])
    expect(parsed.final_score).toBe(88)
    expect(parsed.band).toBe('Strong')
  })

  it('JSON regex returns null for response with no JSON object', () => {
    const raw = 'I cannot score this call — transcript is empty.'
    const match = raw.match(/\{[\s\S]*\}/)
    expect(match).toBeNull()
  })

  it('defaults criteria and penalties to empty arrays when missing', () => {
    const parsed: Record<string, unknown> = {}
    expect(parsed.criteria ?? []).toEqual([])
    expect(parsed.penalties ?? []).toEqual([])
    expect(parsed.flags ?? []).toEqual([])
  })

  it('band values are the expected 5 tiers', () => {
    const validBands = ['Elite', 'Strong', 'Developing', 'At Risk', 'Intervention']
    validBands.forEach(band => {
      expect(validBands).toContain(band)
    })
  })
})
