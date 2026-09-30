import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { periodBounds, fmtDisplay, DATE_PRESETS } from '../lib/date-utils'

// ── periodBounds ──────────────────────────────────────────────────────────────

describe('periodBounds', () => {
  const FIXED_NOW = new Date('2026-09-24T12:00:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('"all" returns null from and null to', () => {
    const { from, to } = periodBounds('all', '', '')
    expect(from).toBeNull()
    expect(to).toBeNull()
  })

  it('"today" sets from to today midnight, to to null', () => {
    const { from, to } = periodBounds('today', '', '')
    expect(to).toBeNull()
    expect(from).not.toBeNull()
    expect(from!.getFullYear()).toBe(2026)
    expect(from!.getMonth()).toBe(8) // September = 8
    expect(from!.getDate()).toBe(24)
    expect(from!.getHours()).toBe(0)
    expect(from!.getMinutes()).toBe(0)
  })

  it('"yesterday" sets from to yesterday and to to today', () => {
    const { from, to } = periodBounds('yesterday', '', '')
    expect(from).not.toBeNull()
    expect(to).not.toBeNull()
    expect(from!.getDate()).toBe(23)
    expect(to!.getDate()).toBe(24)
  })

  it('"7d" sets from to 7 days ago, to to null', () => {
    const { from, to } = periodBounds('7d', '', '')
    expect(to).toBeNull()
    expect(from).not.toBeNull()
    expect(from!.getDate()).toBe(17) // 24 - 7
  })

  it('"30d" sets from to 30 days ago', () => {
    const { from, to } = periodBounds('30d', '', '')
    expect(to).toBeNull()
    expect(from).not.toBeNull()
    // Sep 24 - 30 days = Aug 25
    expect(from!.getMonth()).toBe(7) // August = 7
    expect(from!.getDate()).toBe(25)
  })

  it('"month" sets from to first day of current month', () => {
    const { from, to } = periodBounds('month', '', '')
    expect(to).toBeNull()
    expect(from).not.toBeNull()
    expect(from!.getDate()).toBe(1)
    expect(from!.getMonth()).toBe(8) // September
    expect(from!.getFullYear()).toBe(2026)
  })

  it('"custom" returns null when no dates provided', () => {
    const { from, to } = periodBounds('custom', '', '')
    expect(from).toBeNull()
    expect(to).toBeNull()
  })

  it('"custom" parses from date correctly', () => {
    const { from } = periodBounds('custom', '2026-08-15', '')
    expect(from).not.toBeNull()
    expect(from!.getFullYear()).toBe(2026)
    expect(from!.getMonth()).toBe(7) // August
    expect(from!.getDate()).toBe(15)
  })

  it('"custom" parses to date and sets end of day', () => {
    const { to } = periodBounds('custom', '', '2026-08-15')
    expect(to).not.toBeNull()
    expect(to!.getHours()).toBe(23)
    expect(to!.getMinutes()).toBe(59)
    expect(to!.getSeconds()).toBe(59)
  })

  it('"custom" with both dates spans the range', () => {
    const { from, to } = periodBounds('custom', '2026-01-01', '2026-12-31')
    expect(from!.getMonth()).toBe(0)  // January
    expect(to!.getMonth()).toBe(11)   // December
  })

  it('"today" from date has time at midnight', () => {
    const { from } = periodBounds('today', '', '')
    expect(from!.getHours()).toBe(0)
    expect(from!.getMinutes()).toBe(0)
    expect(from!.getSeconds()).toBe(0)
  })
})

// ── fmtDisplay ────────────────────────────────────────────────────────────────

describe('fmtDisplay', () => {
  it('formats a valid date string', () => {
    const result = fmtDisplay('2026-09-24')
    expect(result).toContain('2026')
    expect(result).toContain('Sep')
  })

  it('returns "Pick date" for empty string', () => {
    expect(fmtDisplay('')).toBe('Pick date')
  })

  it('returns "Pick date" for invalid date', () => {
    expect(fmtDisplay('not-a-date')).toBe('Pick date')
  })

  it('includes the day number', () => {
    const result = fmtDisplay('2026-01-05')
    expect(result).toContain('5')
  })

  it('formats January correctly', () => {
    expect(fmtDisplay('2026-01-01')).toContain('Jan')
  })

  it('formats December correctly', () => {
    expect(fmtDisplay('2026-12-31')).toContain('Dec')
  })
})

// ── DATE_PRESETS ──────────────────────────────────────────────────────────────

describe('DATE_PRESETS', () => {
  it('contains exactly 7 presets', () => {
    expect(DATE_PRESETS).toHaveLength(7)
  })

  it('includes "today" preset', () => {
    expect(DATE_PRESETS.find(p => p.value === 'today')).toBeDefined()
  })

  it('includes "all" preset', () => {
    expect(DATE_PRESETS.find(p => p.value === 'all')).toBeDefined()
  })

  it('includes "custom" preset', () => {
    expect(DATE_PRESETS.find(p => p.value === 'custom')).toBeDefined()
  })

  it('all presets have non-empty labels', () => {
    DATE_PRESETS.forEach(p => {
      expect(p.label.length).toBeGreaterThan(0)
    })
  })

  it('all preset values are unique', () => {
    const values = DATE_PRESETS.map(p => p.value)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('"today" is the first preset', () => {
    expect(DATE_PRESETS[0].value).toBe('today')
  })

  it('"custom" is the last preset', () => {
    expect(DATE_PRESETS[DATE_PRESETS.length - 1].value).toBe('custom')
  })
})
