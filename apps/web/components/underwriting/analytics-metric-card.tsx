'use client'

import { BarChart2, DollarSign, TrendingUp, Wrench } from 'lucide-react'

const ICONS = {
  'trending-up': TrendingUp,
  'dollar-sign': DollarSign,
  wrench: Wrench,
  'bar-chart-2': BarChart2,
} as const

export type AnalyticsMetricIcon = keyof typeof ICONS

export function AnalyticsMetricCard({
  label, value, sub, icon, color = '#307DC0', rgb = '48,125,192',
}: {
  label: string
  value: string
  sub?: string
  icon: AnalyticsMetricIcon
  color?: string
  rgb?: string
}) {
  const Icon = ICONS[icon]
  return (
    <div
      className="rounded-xl p-5 border relative overflow-hidden transition-all duration-200 group"
      style={{ background: '#0F2032', border: `1px solid rgba(${rgb},0.13)` }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.border = `1px solid rgba(${rgb},0.38)`
        el.style.boxShadow = `0 6px 24px rgba(${rgb},0.12)`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.border = `1px solid rgba(${rgb},0.13)`
        el.style.boxShadow = 'none'
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 group-hover:text-white" style={{ color: '#7a94b0' }}>{label}</span>
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{ background: `rgba(${rgb},0.10)`, border: `1px solid rgba(${rgb},0.15)` }}
        >
          <Icon size={15} style={{ color }} strokeWidth={2} />
        </div>
      </div>

      <p className="text-white font-extrabold leading-none tracking-tight" style={{ fontSize: 32 }}>{value}</p>
      {sub && <p className="text-muted text-[11px] mt-1.5 font-medium">{sub}</p>}
    </div>
  )
}
