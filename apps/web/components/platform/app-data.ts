import type { ElementType } from 'react'
import {
  Mic, Building2, Bot, GraduationCap, BookOpen, NotebookPen, Database, Search,
  LayoutDashboard, Phone, Trophy, BarChart3, BarChart2, Users, ShieldCheck, Hash, FolderOpen,
} from 'lucide-react'

export interface Access {
  underwriting:   boolean
  salesCoach:     boolean
  trainingCoach:  boolean
  noteTaker:      boolean
  dataEnrichment: boolean
  skipTracing:    boolean
}

export type AccessKey = keyof Access

export type SubNavItem = {
  href:     string
  label:    string
  icon:     ElementType
  exact?:   boolean
  minRole?: 'admin' | 'super_admin'
  maxRole?: 'admin'  // hide from roles above this (e.g. hide from super_admin)
}

export type AppEntry = {
  id:        string
  label:     string
  tagline:   string
  desc:      string
  features:  string[]
  status:    'live' | 'soon'
  href:      string
  target?:   '_blank'
  icon:      ElementType
  accessKey: AccessKey | null
  accentRgb: string
  subNav?:   SubNavItem[]
}

export const APP_REGISTRY: AppEntry[] = [
  {
    id: 'sales-coach', label: 'AI Sales Coach', status: 'live',
    tagline: 'Every Call, Scored & Coached',
    desc: 'Score Live Transcripts Against FUS/ACQ Rubrics. Surface Actionable Coaching Insights And Drive Rep Performance At Scale.',
    features: ['FUS & ACQ Rubric Scoring', 'Live & Training Call Analysis', 'Leaderboard & Team Analytics'],
    href: '/sales-coach/live-calls', icon: Mic, accessKey: 'salesCoach', accentRgb: '48,125,192',
    subNav: [
      { href: '/sales-coach/live-calls',                label: 'Live Calls',  icon: Phone                               },
      { href: '/sales-coach/leaderboard',               label: 'Leaderboard', icon: Trophy                              },
      { href: '/sales-coach/analytics',                 label: 'Analytics',   icon: BarChart3                           },
      { href: '/sales-coach/super-admin/companies',     label: 'Companies',   icon: ShieldCheck, minRole: 'super_admin' },
    ],
  },
  {
    id: 'deal-uw', label: 'AI Deal Underwriter', status: 'live',
    tagline: 'Underwrite Deals In Minutes',
    desc: 'Pull Live Comps, Run ARV Calculations, And Generate A Full Investment Report Automatically — Close Faster With Confidence.',
    features: ['Live Comps & AVM Data', 'ARV & Max Offer Calculator', 'Full PDF Report Export'],
    href: '/underwriting', icon: Building2, accessKey: 'underwriting', accentRgb: '67,183,73',
    subNav: [
      { href: '/underwriting',          label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/underwriting/deals',    label: 'Deals',     icon: FolderOpen                  },
      { href: '/underwriting/analytics',label: 'Analytics', icon: BarChart2                   },
    ],
  },
  {
    id: 'training-coach', label: 'AI Training Coach', status: 'live',
    tagline: 'Onboard Reps 3× Faster',
    desc: 'Score AI Role-Play Training Calls Against The Same Rubrics As Live Calls — So Reps Improve Before Touching A Real Lead.',
    features: ['AI Role-Play Scoring', 'Per-Agent Practice History', 'Same Rubric As Live Calls'],
    href: '/training-coach', icon: GraduationCap, accessKey: 'trainingCoach', accentRgb: '252,175,23',
    subNav: [
      { href: '/training-coach',                        label: 'Training Calls', icon: Phone,   exact: true           },
      { href: '/training-coach/my-numbers',             label: 'My Numbers',  icon: Hash,  maxRole: 'admin'      },
      { href: '/training-coach/agents',                 label: 'AI Agents',   icon: Bot                           },
      { href: '/training-coach/admin/user-phones',      label: 'User Phones', icon: Users,   minRole: 'super_admin' },
    ],
  },
  {
    id: 'note-taker', label: 'AI Note Taker', status: 'live',
    tagline: 'Auto-Notes From Every Call',
    desc: 'Capture, Structure, And Summarize Key Moments From Calls Automatically — Powered By Your n8n Workflows.',
    features: ['Inbound & Outbound Call Notes', 'AI + Plain Summaries', 'Token Usage & Cost Tracking'],
    href: '/note-taker', icon: NotebookPen, accessKey: 'noteTaker', accentRgb: '48,125,192',
    subNav: [
      { href: '/note-taker', label: 'Call Logs', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    id: 'data-enrichment', label: 'AI Data Enrichment', status: 'live',
    tagline: 'Supercharge Your Lead Data',
    desc: 'Enrich Property Leads With Ownership History, Market Data, And Investment Signals — All Logged Automatically From n8n.',
    features: ['Dynamic Field Enrichment', 'Per-Record Detail View', 'Full Enrichment Audit Trail'],
    href: '/data-enrichment', icon: Database, accessKey: 'dataEnrichment', accentRgb: '48,125,192',
    subNav: [
      { href: '/data-enrichment', label: 'Enrichment', icon: Database, exact: true },
    ],
  },
  {
    id: 'skip-tracing', label: 'AI Skip Tracing', status: 'live',
    tagline: 'Find Anyone, Instantly',
    desc: 'Run APN Lookups, Skip Traces, And DNC Checks Against Tracerfy — All Logs And Costs Tracked Automatically From Your n8n Workflows.',
    features: ['APN & Address Skip Trace', 'DNC Lookup & Clean Flag', 'Per-Lookup Credit Tracking'],
    href: '/skip-tracing', icon: Search, accessKey: 'skipTracing', accentRgb: '67,183,73',
    subNav: [
      { href: '/skip-tracing', label: 'Lookup Logs', icon: Search, exact: true },
    ],
  },
  {
    id: 'agent', label: 'AI Agent', status: 'live',
    tagline: 'Your 24/7 Acquisition Assistant',
    desc: 'Automate Lead Follow-Up, Handle Objections, And Schedule Appointments — Without Lifting A Finger.',
    features: ['Automated Lead Follow-Up', 'Objection Handling', 'Appointment Scheduling'],
    href: '/ai-agents', icon: Bot, accessKey: null, accentRgb: '67,183,73',
  },
  {
    id: 'knowledge-base', label: 'Knowledge Base', status: 'live',
    tagline: "Your Team's Brain, Always On",
    desc: 'Centralize Scripts, Objection Handlers, And Playbooks. AI-Powered Search So Reps Find The Right Answer Instantly.',
    features: ['AI-Powered Search', 'Script & Playbook Library', 'Team Knowledge Sharing'],
    href: '/knowledge-base', icon: BookOpen, accessKey: null, accentRgb: '48,125,192',
  },
]
