'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, BarChart3 } from 'lucide-react'
import type { PlanId } from '@kpidriver/auth/types'
import PlatformShell, { type Access } from '@/components/platform/PlatformShell'
import { C } from '@/components/platform/brand'
import WalletTab from './wallet-tab'
import UsageTab, { type UsageLogRow } from './usage-tab'
import type { TopUpOption } from '@kpidriver/stripe/topup'

export interface AppSpendRow {
  app:                  string
  total_cost:           number
  run_count:            number
  total_input_tokens:   number
  total_output_tokens:  number
  ai_cost:              number
  transcription_cost:   number
  property_api_1_cost:  number
  property_api_2_cost:  number
  voice_agent_cost:     number
}

interface AutoTopup {
  enabled:   boolean
  priceId:   string | null
  threshold: number | null
}

interface Props {
  user:           { id: string; email: string; fullName: string | null }
  planId:         PlanId | null
  access:         Access
  accessRole:     'admin' | 'super_admin' | 'user'
  balance:        number
  appSpend:       AppSpendRow[]
  topUpOptions:   TopUpOption[]
  usageLogs:      UsageLogRow[]
  autoTopup:      AutoTopup
  dealAddresses:  Record<string, string>
}

const TABS = [
  { id: 'wallet' as const, label: 'Wallet', icon: Wallet },
  { id: 'usage'  as const, label: 'Usage',  icon: BarChart3 },
]

export default function BillingClient({ user, planId, access, accessRole, balance, appSpend, topUpOptions, usageLogs, autoTopup, dealAddresses }: Props) {
  const [tab, setTab] = useState<'wallet' | 'usage'>('wallet')

  return (
    <PlatformShell planId={planId} pageTitle="Billing">

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.white, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Billing
        </h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: C.bodyText, margin: 0 }}>
          Manage Your Wallet, Payment Methods, And Usage.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map((t) => {
          const active = tab === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 16px', marginBottom: -1,
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: active ? `2px solid ${C.green}` : '2px solid transparent',
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? C.text : C.dimText,
                transition: 'color 0.15s',
              }}
            >
              <Icon size={15} style={{ color: active ? C.green : C.dimText }} />
              {t.label}
            </button>
          )
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {tab === 'wallet' ? (
          <WalletTab balance={balance} appSpend={appSpend} topUpOptions={topUpOptions} autoTopup={autoTopup} access={access} usageLogs={usageLogs} />
        ) : (
          <UsageTab rows={usageLogs} dealAddresses={dealAddresses} />
        )}
      </motion.div>
    </PlatformShell>
  )
}
