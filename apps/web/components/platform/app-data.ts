import type { ElementType } from 'react'
import {
  Mic, Building2, Bot, GraduationCap, BookOpen, NotebookPen, Database, Search,
  LayoutDashboard, Phone, Trophy, BarChart3, BarChart2, Users, Hash, FolderOpen,
  TrendingUp, MessageSquare, Mail, MousePointerClick, UserCheck, Home,
} from 'lucide-react'

export interface Access {
  underwriting:   boolean
  salesCoach:     boolean
  trainingCoach:  boolean
  noteTaker:      boolean
  dataEnrichment: boolean
  skipTracing:    boolean
  kpiDashboard:   boolean
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
    tagline: 'Every Call Scored & Coached',
    desc: 'Score Calls Against Our Failsafe Rubrics. Surface Actionable Coaching Insights & Drive Rep Performance At Scale.',
    features: ['Post Call Rubric Driven Analysis', 'Leaderboard & Team Analytics', 'Receive Feedback Daily, Weekly, Monthly Via Email'],
    href: '/sales-coach/live-calls', icon: Mic, accessKey: 'salesCoach', accentRgb: '48,125,192',
    subNav: [
      { href: '/sales-coach/live-calls',                label: 'Call Logs',   icon: Phone                               },
      { href: '/sales-coach/leaderboard',               label: 'Leaderboard', icon: Trophy                              },
      { href: '/sales-coach/analytics',                 label: 'Analytics',   icon: BarChart3                           },
    ],
  },
  {
    id: 'training-coach', label: 'AI Training Coach', status: 'live',
    tagline: 'Train & Onboard Reps 3X Faster',
    desc: 'Score AI Role-Play Training Calls Against The Same Rubrics As Live Calls. So Reps Improve Before Touching A Real Lead.',
    features: ['AI Role-Play Scoring', 'Per-Agent Practice History', 'Same Rubric As Live Calls'],
    href: '/training-coach', icon: GraduationCap, accessKey: 'trainingCoach', accentRgb: '252,175,23',
    subNav: [
      { href: '/training-coach',                        label: 'Training Calls', icon: Phone,     exact: true           },
      { href: '/training-coach/my-numbers',             label: 'My Numbers',     icon: Hash,      maxRole: 'admin'      },
      { href: '/training-coach/agents',                 label: 'AI Agents',      icon: Bot                              },
      { href: '/training-coach/admin/user-phones',      label: 'User Phones',    icon: Users,     minRole: 'super_admin' },
      { href: '/training-coach/analytics',              label: 'Analytics',      icon: BarChart2                        },
    ],
  },
  {
    id: 'deal-uw', label: 'AI Deal Underwriter', status: 'live',
    tagline: 'Underwrite Deals In Minutes',
    desc: 'Pull Live Comps, Run ARV Calculations, And Generate A Full Investment Report Automatically. Close Faster With Confidence.',
    features: ['Live Comps & AVM Data', 'ARV & Max Offer Calculator', 'Full PDF Report Export'],
    href: '/underwriting', icon: Building2, accessKey: 'underwriting', accentRgb: '67,183,73',
    subNav: [
      { href: '/underwriting',          label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/underwriting/deals',    label: 'Deals',     icon: FolderOpen                  },
      { href: '/underwriting/analytics',label: 'Analytics', icon: BarChart2                   },
    ],
  },
  {
    id: 'skip-tracing', label: 'AI Skiptracing', status: 'live',
    tagline: 'Find Anyone, Instantly',
    desc: 'Instantly Skiptrace Anything on Your CRM. No Name No Problem, Address Only Skiptracing is Available, Stuck on an APN, We Got you!',
    features: ['Address Only & APN Skiptrace', 'DNC & Litigator Scrub', 'See All Your Results in One Place'],
    href: '/skip-tracing', icon: Search, accessKey: 'skipTracing', accentRgb: '67,183,73',
    subNav: [
      { href: '/skip-tracing', label: 'Lookup Logs', icon: Search, exact: true },
    ],
  },
  {
    id: 'note-taker', label: 'AI Note Taker', status: 'live',
    tagline: 'Transcription, Notes Taking & Smart Field Filling For Every Call',
    desc: 'Capture, Structure, And Summarize Key Moments From Calls Automatically.',
    features: ['Focus on Closing Deals, Leave the Notes on Us', 'Transcription & AI Summaries', 'Too Lazy To Fill Fields? No Problem!'],
    href: '/note-taker', icon: NotebookPen, accessKey: 'noteTaker', accentRgb: '48,125,192',
    subNav: [
      { href: '/note-taker', label: 'Note Taker Logs', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    id: 'data-enrichment', label: 'AI Data Enrichment', status: 'live',
    tagline: 'Supercharge Your Lead Data',
    desc: 'Enrich Property Leads With Ownership History, Market Data, And Investment Signals. All Logged Automatically From n8n.',
    features: ['Dynamic Field Enrichment', 'Per-Record Detail View', 'Full Enrichment Audit Trail'],
    href: '/data-enrichment', icon: Database, accessKey: 'dataEnrichment', accentRgb: '48,125,192',
    subNav: [
      { href: '/data-enrichment', label: 'Enrichment Logs', icon: Database, exact: true },
    ],
  },
  {
    id: 'kpi-dashboard', label: 'KPI Dashboard', status: 'live',
    tagline: 'Every KPI, One Place',
    desc: 'Track ACQ & DISPO Performance In Real Time. Funnels, Conversion Rates, And Rep Leaderboards — Straight From GHL.',
    features: ['ACQ & DISPO Funnel Tracking', 'Live Conversion Ratios', 'Per-Rep Leaderboard'],
    href: '/kpi-dashboard', icon: TrendingUp, accessKey: 'kpiDashboard', accentRgb: '252,175,23',
    subNav: [
      { href: '/kpi-dashboard',             label: 'Overview',     icon: LayoutDashboard, exact: true },
      { href: '/kpi-dashboard/acq',         label: 'ACQ Funnel',   icon: BarChart3                   },
      { href: '/kpi-dashboard/dispo',       label: 'DISPO Funnel', icon: BarChart2                   },
      // { href: '/kpi-dashboard/leaderboard', label: 'Leaderboard',  icon: Trophy                      },
      { href: '/kpi-dashboard/calls',       label: 'Call KPIs',   icon: Phone              },
      { href: '/kpi-dashboard/sms',         label: 'SMS KPIs',    icon: MessageSquare      },
      { href: '/kpi-dashboard/ppc',         label: 'PPC KPIs',    icon: MousePointerClick  },
      { href: '/kpi-dashboard/dm',          label: 'DM KPIs',     icon: Mail               },
      { href: '/kpi-dashboard/ppl',         label: 'PPL KPIs',    icon: UserCheck          },
      { href: '/kpi-dashboard/seo',         label: 'SEO KPIs',    icon: Search             },
      { href: '/kpi-dashboard/listed',      label: 'Listed KPIs', icon: Home               },
    ],
  },
  {
    id: 'agent', label: 'AI Agent', status: 'live',
    tagline: 'Your 24/7 Lead Manager',
    desc: 'Automate Lead Follow-Up, Handle Objections, And Schedule Appointments. Without Lifting A Finger.',
    features: ['Automated Lead Follow-Up', 'Objection Handling', 'Appointment Scheduling'],
    href: '/ai-agents', icon: Bot, accessKey: null, accentRgb: '67,183,73',
  },
  {
    id: 'knowledge-base', label: 'Knowledge Base', status: 'live',
    tagline: 'All Answers In One Place',
    desc: 'Centralized Hub Containing Walkthroughs for CRM Best Practices.',
    features: ['Shareable With Team Members', 'Onboarding Made Easy', 'Up To Date Articles & Walkthroughs'],
    href: '/knowledge-base', icon: BookOpen, accessKey: null, accentRgb: '48,125,192',
  },
]
