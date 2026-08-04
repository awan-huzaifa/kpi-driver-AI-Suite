export type ReportType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly'

export interface LocalDate {
  year: number
  month: number      // 1-12
  day: number
  dayOfWeek: number  // 0=Sun 1=Mon ... 6=Sat
}

export interface PeriodBounds {
  type:  ReportType
  from:  string  // ISO UTC
  to:    string  // ISO UTC
  label: string  // Human-readable, e.g. "January 2025"
}

export function getLocalHour(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', hour12: false,
  }).formatToParts(date)
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? '0')
  return h === 24 ? 0 : h
}

export function getLocalDate(date: Date, tz: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
    hour12: false,
  }).formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '0'
  const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    year:       Number(get('year')),
    month:      Number(get('month')),
    day:        Number(get('day')),
    dayOfWeek:  DOW[get('weekday')] ?? 0,
  }
}

export function getDueReportTypes(d: LocalDate): ReportType[] {
  const due: ReportType[] = ['daily']
  if (d.dayOfWeek === 1) due.push('weekly')
  if (d.day === 1) {
    due.push('monthly')
    if ([1, 4, 7, 10].includes(d.month)) {
      due.push('quarterly')
      if ([1, 7].includes(d.month)) {
        due.push('biannual')
        if (d.month === 1) due.push('yearly')
      }
    }
  }
  return due
}

function pad(n: number) { return String(n).padStart(2, '0') }

function isoDate(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function fmtLong(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function getPeriodBounds(type: ReportType, d: LocalDate): PeriodBounds {
  const { year, month, day } = d

  switch (type) {
    case 'daily': {
      const prev = new Date(Date.UTC(year, month - 1, day - 1))
      const ds   = isoDate(prev)
      return { type, from: `${ds}T00:00:00.000Z`, to: `${ds}T23:59:59.999Z`, label: fmtLong(prev) }
    }

    case 'weekly': {
      const sun = new Date(Date.UTC(year, month - 1, day - 1))   // yesterday = Sunday
      const mon = new Date(Date.UTC(year, month - 1, day - 7))   // 7 days ago = Monday
      return {
        type,
        from:  `${isoDate(mon)}T00:00:00.000Z`,
        to:    `${isoDate(sun)}T23:59:59.999Z`,
        label: `${fmtShort(mon)} – ${fmtShort(sun)}`,
      }
    }

    case 'monthly': {
      const pm = month === 1 ? 12 : month - 1
      const py = month === 1 ? year - 1 : year
      const lastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()
      const start = new Date(Date.UTC(py, pm - 1, 1))
      return {
        type,
        from:  `${py}-${pad(pm)}-01T00:00:00.000Z`,
        to:    `${py}-${pad(pm)}-${pad(lastDay)}T23:59:59.999Z`,
        label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      }
    }

    case 'quarterly': {
      const qStartMonth = month === 1 ? 10 : month - 3
      const qStartYear  = month === 1 ? year - 1 : year
      const qEndMonth   = month === 1 ? 12 : month - 1
      const qEndYear    = year
      const lastDay     = new Date(Date.UTC(qEndYear, qEndMonth, 0)).getUTCDate()
      const qNum        = Math.ceil(qStartMonth / 3)
      return {
        type,
        from:  `${qStartYear}-${pad(qStartMonth)}-01T00:00:00.000Z`,
        to:    `${qEndYear}-${pad(qEndMonth)}-${pad(lastDay)}T23:59:59.999Z`,
        label: `Q${qNum} ${qStartYear}`,
      }
    }

    case 'biannual': {
      if (month === 1) {
        return { type, from: `${year-1}-07-01T00:00:00.000Z`, to: `${year-1}-12-31T23:59:59.999Z`, label: `H2 ${year-1}` }
      }
      return { type, from: `${year}-01-01T00:00:00.000Z`, to: `${year}-06-30T23:59:59.999Z`, label: `H1 ${year}` }
    }

    case 'yearly':
      return { type, from: `${year-1}-01-01T00:00:00.000Z`, to: `${year-1}-12-31T23:59:59.999Z`, label: String(year - 1) }
  }
}

export const REPORT_LABELS: Record<ReportType, string> = {
  daily:    'Daily',
  weekly:   'Weekly',
  monthly:  'Monthly',
  quarterly:'Quarterly',
  biannual: 'Bi-Annual',
  yearly:   'Annual',
}
