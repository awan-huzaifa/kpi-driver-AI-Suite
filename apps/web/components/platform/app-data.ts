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
    tagline: 'Every call, scored & coached',
    desc: 'Score live transcripts against FUS/ACQ rubrics. Surface actionable coaching insights and drive rep performance at scale.',
    features: ['FUS & ACQ rubric scoring', 'Live & training call analysis', 'Leaderboard & team analytics'],
    href: '/sales-coach', icon: Mic, accessKey: 'salesCoach', accentRgb: '48,125,192',
    subNav: [
      { href: '/sales-coach',                           label: 'Dashboard',   icon: LayoutDashboard, exact: true         },
      { href: '/sales-coach/live-calls',                label: 'Live Calls',  icon: Phone                               },
      { href: '/sales-coach/leaderboard',               label: 'Leaderboard', icon: Trophy                              },
      { href: '/sales-coach/analytics',                 label: 'Analytics',   icon: BarChart3                           },
      { href: '/sales-coach/super-admin/companies',     label: 'Companies',   icon: ShieldCheck, minRole: 'super_admin' },
    ],
  },
  {
    id: 'deal-uw', label: 'AI Deal Underwriter', status: 'live',
    tagline: 'Underwrite deals in minutes',
    desc: 'Pull live comps, run ARV calculations, and generate a full investment report automatically — close faster with confidence.',
    features: ['Live comps & AVM data', 'ARV & max offer calculator', 'Full PDF report export'],
    href: '/underwriting', icon: Building2, accessKey: 'underwriting', accentRgb: '67,183,73',
    subNav: [
      { href: '/underwriting',          label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/underwriting/deals',    label: 'Deals',     icon: FolderOpen                  },
      { href: '/underwriting/analytics',label: 'Analytics', icon: BarChart2                   },
    ],
  },
  {
    id: 'training-coach', label: 'AI Training Coach', status: 'live',
    tagline: 'Onboard reps 3× faster',
    desc: 'Score AI role-play training calls against the same rubrics as live calls — so reps improve before touching a real lead.',
    features: ['AI role-play scoring', 'Per-agent practice history', 'Same rubric as live calls'],
    href: '/training-coach', icon: GraduationCap, accessKey: 'trainingCoach', accentRgb: '252,175,23',
    subNav: [
      { href: '/training-coach',                        label: 'My Calls',    icon: Phone,   exact: true           },
      { href: '/training-coach/my-numbers',             label: 'My Numbers',  icon: Hash,  maxRole: 'admin'      },
      { href: '/training-coach/agents',                 label: 'AI Agents',   icon: Bot                           },
      { href: '/training-coach/admin/user-phones',      label: 'User Phones', icon: Users,   minRole: 'super_admin' },
    ],
  },
  {
    id: 'note-taker', label: 'AI Note Taker', status: 'live',
    tagline: 'Auto-notes from every call',
    desc: 'Capture, structure, and summarize key moments from calls automatically — powered by your n8n workflows.',
    features: ['Inbound & outbound call notes', 'AI + plain summaries', 'Token usage & cost tracking'],
    href: '/note-taker', icon: NotebookPen, accessKey: 'noteTaker', accentRgb: '48,125,192',
    subNav: [
      { href: '/note-taker', label: 'Call Logs', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    id: 'data-enrichment', label: 'AI Data Enrichment', status: 'live',
    tagline: 'Supercharge your lead data',
    desc: 'Enrich property leads with ownership history, market data, and investment signals — all logged automatically from n8n.',
    features: ['Dynamic field enrichment', 'Per-record detail view', 'Full enrichment audit trail'],
    href: '/data-enrichment', icon: Database, accessKey: 'dataEnrichment', accentRgb: '48,125,192',
    subNav: [
      { href: '/data-enrichment', label: 'Enrichment', icon: Database, exact: true },
    ],
  },
  {
    id: 'skip-tracing', label: 'AI Skip Tracing', status: 'live',
    tagline: 'Find anyone, instantly',
    desc: 'Run APN lookups, skip traces, and DNC checks against Tracerfy — all logs and costs tracked automatically from your n8n workflows.',
    features: ['APN & address skip trace', 'DNC lookup & clean flag', 'Per-lookup credit tracking'],
    href: '/skip-tracing', icon: Search, accessKey: 'skipTracing', accentRgb: '67,183,73',
    subNav: [
      { href: '/skip-tracing', label: 'Lookup Logs', icon: Search, exact: true },
    ],
  },
  {
    id: 'agent', label: 'AI Agent', status: 'live',
    tagline: 'Your 24/7 acquisition assistant',
    desc: 'Automate lead follow-up, handle objections, and schedule appointments — without lifting a finger.',
    features: ['Automated lead follow-up', 'Objection handling', 'Appointment scheduling'],
    href: '/ai-agents', icon: Bot, accessKey: null, accentRgb: '67,183,73',
  },
  {
    id: 'knowledge-base', label: 'Knowledge Base', status: 'live',
    tagline: "Your team's brain, always on",
    desc: 'Centralize scripts, objection handlers, and playbooks. AI-powered search so reps find the right answer instantly.',
    features: ['AI-powered search', 'Script & playbook library', 'Team knowledge sharing'],
    href: '/knowledge-base', icon: BookOpen, accessKey: null, accentRgb: '48,125,192',
  },
]
