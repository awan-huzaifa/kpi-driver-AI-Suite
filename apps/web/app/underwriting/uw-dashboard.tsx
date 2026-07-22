'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Building2, DollarSign, TrendingUp, Clock,
  CheckCircle2, AlertCircle, XCircle, ArrowRight, Plus,
} from 'lucide-react'
import { NewDealModal } from '@/components/underwriting/new-deal-modal'

/* ── Types ──────────────────────────────────────────────────────── */

type DealRow = {
  id: string
  address: string
  status: string
  recommendation: string | null
  max_offer: number | null
  created_at: string
}

interface Props {

  totalDeals: number
  completedCount: number
  portfolioValue: number
  pursueRate: number | null
  pursueCount: number
  pendingCount: number
  recent: DealRow[]
  hasMore: boolean
}

/* ── Helpers ────────────────────────────────────────────────────── */

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return '$' + Math.round(n).toLocaleString()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ── Color palette ───────────────────────────────────────────────── */

const ACCENT = {
  blue:   { hex: '#307DC0', rgb: '48,125,192'  },
  green:  { hex: '#43B749', rgb: '67,183,73'   },
  yellow: { hex: '#FCAF17', rgb: '252,175,23'  },
}
type AccentKey = keyof typeof ACCENT

/* ── Stat card ──────────────────────────────────────────────────── */

function StatCard({
  label, value, sub, icon: Icon, delay = 0, accent = 'blue',
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; delay?: number; accent?: AccentKey
}) {
  const [hovered, setHovered] = useState(false)
  const c = ACCENT[accent]
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered ? `rgba(${c.rgb},0.07)` : '#0F2032',
        border: `1px solid ${hovered ? `rgba(${c.rgb},0.38)` : `rgba(${c.rgb},0.13)`}`,
        borderRadius: 16,
        padding: '22px',
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? `0 6px 28px rgba(${c.rgb},0.14)` : 'none',
        cursor: 'default',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${c.hex} 0%, rgba(${c.rgb},0) 100%)`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: hovered ? c.hex : '#7a94b0', margin: 0, transition: 'color 0.2s' }}>
          {label}
        </p>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: hovered ? `rgba(${c.rgb},0.18)` : `rgba(${c.rgb},0.10)`,
          border: `1px solid ${hovered ? `rgba(${c.rgb},0.32)` : `rgba(${c.rgb},0.15)`}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, border-color 0.2s',
        }}>
          <Icon size={16} style={{ color: c.hex }} />
        </div>
      </div>

      <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1, margin: 0 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: '#7a94b0', fontWeight: 500, margin: 0, marginTop: 6 }}>{sub}</p>}
    </motion.div>
  )
}

/* ── Badges ─────────────────────────────────────────────────────── */

function RecommendationBadge({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: '#7a94b0', fontSize: 11 }}>—</span>
  const map: Record<string, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
    pursue:    { bg: 'rgba(67,183,73,0.12)',  border: 'rgba(67,183,73,0.28)',  color: '#43B749', icon: <CheckCircle2 size={11} /> },
    negotiate: { bg: 'rgba(252,175,23,0.12)', border: 'rgba(252,175,23,0.28)', color: '#FCAF17', icon: <AlertCircle size={11} /> },
    pass:      { bg: 'rgba(237,31,36,0.12)',  border: 'rgba(237,31,36,0.28)',  color: '#ED1F24', icon: <XCircle size={11} /> },
  }
  const { bg, border, color, icon } = map[value] ?? map.negotiate
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: bg, border: `1px solid ${border}`, color,
      textTransform: 'capitalize',
    }}>
      {icon}{value}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    completed: { bg: 'rgba(67,183,73,0.12)',  border: 'rgba(67,183,73,0.28)',  color: '#43B749' },
    pending:   { bg: 'rgba(252,175,23,0.12)', border: 'rgba(252,175,23,0.28)', color: '#FCAF17' },
    failed:    { bg: 'rgba(237,31,36,0.12)',  border: 'rgba(237,31,36,0.28)',  color: '#ED1F24' },
  }
  const { bg, border, color } = map[status] ?? map.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: bg, border: `1px solid ${border}`, color,
      textTransform: 'capitalize',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0 }} />
      {status}
    </span>
  )
}

/* ── Deal row ───────────────────────────────────────────────────── */

function DealRow({ deal, delay }: { deal: DealRow; delay: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(48,125,192,0.05)' : 'transparent',
        borderBottom: '1px solid rgba(48,125,192,0.08)',
        transition: 'background 0.15s',
      }}
    >
      <td style={{ padding: '14px 20px' }}>
        <Link href={`/underwriting/deals/${deal.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: deal.status === 'completed' ? '#43B749' : deal.status === 'failed' ? '#ED1F24' : '#FCAF17',
            boxShadow: `0 0 6px ${deal.status === 'completed' ? '#43B749' : deal.status === 'failed' ? '#ED1F24' : '#FCAF17'}`,
          }} />
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: hovered ? '#307DC0' : '#fff',
            transition: 'color 0.15s',
          }}>
            {deal.address}
          </span>
        </Link>
      </td>
      <td style={{ padding: '14px 12px' }}>
        <StatusPill status={deal.status} />
      </td>
      <td style={{ padding: '14px 12px' }}>
        <RecommendationBadge value={deal.recommendation} />
      </td>
      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#307DC0' }}>{fmt(deal.max_offer)}</span>
      </td>
      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
        <span style={{ fontSize: 12, color: '#7a94b0' }}>{fmtDate(deal.created_at)}</span>
      </td>
    </motion.tr>
  )
}

/* ── Main component ─────────────────────────────────────────────── */

export default function UWDashboardClient({
  totalDeals, completedCount, portfolioValue,
  pursueRate, pursueCount, pendingCount, recent, hasMore,
}: Props) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <Building2 size={14} style={{ color: '#43B749' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#43B749', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
              AI Deal Underwriter
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 6px', color: '#fff' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: '#a8bfd4', fontWeight: 500, margin: 0 }}>
            {totalDeals === 0
              ? 'No Deals Yet — Run Your First Underwriting Analysis Below.'
              : `${completedCount} Completed Deal${completedCount !== 1 ? 's' : ''} · Pipeline Ready`}
          </p>
        </div>

        <NewDealModal
          trigger={
            <button className="btn-primary" style={{ flexShrink: 0 }}>
              <Plus size={15} />
              New Deal
            </button>
          }
        />
      </motion.div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard label="Total Deals"    value={String(totalDeals)}   sub={completedCount > 0 ? `${completedCount} Completed` : undefined} icon={Building2}  delay={0.08} accent="blue"   />
        <StatCard label="Pipeline Value" value={portfolioValue > 0 ? fmt(portfolioValue) : '—'} sub={portfolioValue > 0 ? 'Sum Of Max Offers' : 'No Completed Deals'} icon={DollarSign} delay={0.14} accent="green"  />
        <StatCard label="Pursue Rate"    value={pursueRate != null ? `${pursueRate}%` : '—'}  sub={pursueRate != null ? `${pursueCount} Of ${completedCount} Deals` : 'No Data Yet'} icon={TrendingUp} delay={0.20} accent="yellow" />
        <StatCard label="Pending"        value={String(pendingCount)} sub="In Progress"        icon={Clock}      delay={0.26} accent="blue"   />
      </div>

      {/* Recent Deals */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{
          background: '#0F2032',
          border: '1px solid rgba(48,125,192,0.13)',
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {/* Card header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(48,125,192,0.10)',
          background: 'rgba(48,125,192,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(48,125,192,0.12)', border: '1px solid rgba(48,125,192,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={13} style={{ color: '#307DC0' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Recent Deals</span>
          </div>

          {recent.length > 0 && (
            <Link
              href="/underwriting/deals"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600, color: '#307DC0',
                textDecoration: 'none', transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#78ABD6')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#307DC0')}
            >
              View All <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, marginBottom: 18,
              background: 'rgba(48,125,192,0.10)', border: '1px solid rgba(48,125,192,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={24} style={{ color: '#307DC0' }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 8 }}>No Deals Yet</p>
            <p style={{ fontSize: 13, color: '#7a94b0', margin: 0, marginBottom: 24, maxWidth: 300, lineHeight: 1.6 }}>
              Add A Property Address And Let AI Generate A Full Underwriting Analysis In Seconds.
            </p>
            <NewDealModal
              trigger={
                <button className="btn-primary">
                  <Plus size={14} />
                  Create Your First Deal
                </button>
              }
            />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(48,125,192,0.10)' }}>
                {['Address', 'Status', 'Recommendation', 'Max Offer', 'Date'].map((h, i) => (
                  <th key={h} style={{
                    padding: i === 0 ? '10px 20px' : i === 4 ? '10px 20px' : '10px 12px',
                    fontSize: 10, fontWeight: 700, color: '#4a6080',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    textAlign: i >= 3 ? 'right' : 'left',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((deal, i) => (
                <DealRow key={deal.id} deal={deal} delay={0.34 + i * 0.06} />
              ))}
              {hasMore && (
                <tr>
                  <td colSpan={5} style={{ padding: '12px 20px', borderTop: '1px solid rgba(48,125,192,0.08)' }}>
                    <Link
                      href="/underwriting/deals"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        fontSize: 12, fontWeight: 600, color: '#4a6080',
                        textDecoration: 'none', transition: 'color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#307DC0')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#4a6080')}
                    >
                      View All Deals <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </motion.div>

    </div>
  )
}
