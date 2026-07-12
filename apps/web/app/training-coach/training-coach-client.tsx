"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { GraduationCap, PhoneIncoming, PhoneOutgoing, X, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import AudioPlayer from "@/components/ui/AudioPlayer";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import type { AccessRole } from "@/types/database";

interface CoachingAction {
  type:   "behavioral" | "tactical" | "strategic";
  action: string;
}
interface EvidenceSnippet {
  quote:          string;
  why_it_matters: string;
}
interface Penalty { type: string; points: number; reason: string; evidence: string; }
interface Bonus   { type: string; points: number; reason: string; evidence: string; }

interface Evaluation {
  reason:                string | null;
  call_type:             string | null;
  opportunity_level:     "low" | "medium" | "high" | null;
  rubric_version:        string | null;
  score_band:            string | null;
  category_scores:       Record<string, number> | null;
  penalties:             Penalty[];
  bonuses:               Bonus[];
  strengths:             string[];
  missed_opportunities:  string[];
  coaching_actions:      CoachingAction[];
  score_reasoning:       string | null;
  evidence_snippets:     EvidenceSnippet[];
  confidence:            number | null;
  manager_review_needed: boolean;
}

interface TrainingCall {
  id:            string;
  user_id:       string;
  company_id:    string;
  direction:     "inbound" | "outbound";
  duration_sec:  number;
  call_stage:    string | null;
  scorable:      boolean;
  score:         number | null;
  call_summary:  string | null;
  transcript:    string | null;
  recording_url: string | null;
  evaluation:    Evaluation | null;
  created_at:    string;
  agent:         { full_name: string | null; agent_type: string } | null;
  ai_agent:      { agent_name: string } | null;
}

interface Props {
  calls:          TrainingCall[];
  companies:      { id: string; name: string }[];
  accessRole:     AccessRole;
  currentUserId?: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs" style={{ color: "#475569" }}>—</span>;
  const color = score >= 80 ? "#43B749" : score >= 60 ? "#307DC0" : score >= 40 ? "#FCAF17" : "#ED1F24";
  const bg    = score >= 80 ? "rgba(67,183,73,0.1)" : score >= 60 ? "rgba(48,125,192,0.1)" : score >= 40 ? "rgba(252,175,23,0.1)" : "rgba(237,31,36,0.1)";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" style={{ color, background: bg }}>
      {score}
    </span>
  );
}

const CATEGORY_MAX: Record<string, number> = {
  "Rapport & Communication Quality":   15,
  "Qualification Completeness":        25,
  "Motivation Discovery Depth":        15,
  "Conversation Control & Structure":  10,
  "Objection Handling":                15,
  "Scheduling / Next Step Execution":  15,
  "Compliance & Guardrails":            5,
  "Rapport, Trust & Authority":         5,
  "Strategic Discovery & Deal Understanding": 20,
  "Motivation & Pain Extraction":      20,
  "Deal Control & Framing":            10,
  "Offer Strategy & Positioning":      15,
  "Objection Handling (Advanced)":     10,
  "Deal Advancement Decision Quality": 10,
  "Closing / Commitment Execution":    15,
};

function CategoryBar({ name, score }: { name: string; score: number }) {
  const max = CATEGORY_MAX[name] ?? 100;
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = pct >= 80 ? "#43B749" : pct >= 60 ? "#307DC0" : pct >= 40 ? "#FCAF17" : "#ED1F24";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{name}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {score} <span style={{ color: "#334155", fontWeight: 400 }}>/ {max}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
      style={{ color: color ?? "#334155" }}>
      {children}
    </p>
  );
}

const sectionLabelStyle = "text-[10px] font-semibold uppercase tracking-widest";

function DetailModal({ call, onClose }: { call: TrainingCall; onClose: () => void }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const ev = call.evaluation;

  const META = [
    { label: "Direction",  value: call.direction             },
    { label: "Duration",   value: fmtDuration(call.duration_sec) },
    { label: "Stage",      value: call.call_stage  ?? "—"   },
    { label: "AI Agent",   value: call.ai_agent?.agent_name ?? "Unknown" },
    { label: "Rep",        value: call.agent?.full_name ?? "—" },
    { label: "Date",       value: fmt(call.created_at)       },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "rgba(13,28,42,0.99)", border: "1px solid rgba(48,125,192,0.15)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(48,125,192,0.15)" }}>
              {call.direction === "inbound"
                ? <PhoneIncoming size={16} style={{ color: "#78ABD6" }} />
                : <PhoneOutgoing size={16} style={{ color: "#78ABD6" }} />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">{call.agent?.full_name ?? "Unknown Rep"}</h2>
              <p className="text-sm mt-0.5" style={{ color: "#475569" }}>vs {call.ai_agent?.agent_name ?? "Unknown AI Agent"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ev?.score_band && (
              <span className="px-2.5 py-1 rounded-lg text-sm font-semibold" style={{ background: "rgba(48,125,192,0.12)", color: "#78ABD6" }}>{ev.score_band}</span>
            )}
            <ScorePill score={call.score} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#475569" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body: single column ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Meta — 6 items in one row */}
            <div className="grid grid-cols-6 gap-2">
              {META.map(({ label, value }) => (
                <div key={label} className="px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: "#334155" }}>{label}</p>
                  <p className="text-sm font-medium text-white capitalize truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Call summary */}
            {call.call_summary && (
              <div className="px-4 py-3 rounded-xl text-sm leading-relaxed"
                style={{ color: "#94a3b8", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                {call.call_summary}
              </div>
            )}

            {/* Recording */}
            {call.recording_url && <AudioPlayer url={call.recording_url} />}

            {/* Evaluation */}
            {ev && call.scorable ? (
              <>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {ev.opportunity_level && (
                      <span className="px-2.5 py-1 rounded-lg text-sm font-medium capitalize" style={{ background: "rgba(48,125,192,0.1)", color: "#307DC0" }}>{ev.opportunity_level} opportunity</span>
                    )}
                    {ev.call_type && (
                      <span className="px-2.5 py-1 rounded-lg text-sm font-medium" style={{ background: "rgba(255,255,255,0.04)", color: "#64748b" }}>{ev.call_type}</span>
                    )}
                    {ev.confidence != null && (
                      <span className="px-2.5 py-1 rounded-lg text-sm font-medium" style={{ background: "rgba(255,255,255,0.04)", color: "#475569" }}>Confidence {Math.round(ev.confidence * 100)}%</span>
                    )}
                    {ev.manager_review_needed && (
                      <span className="px-2.5 py-1 rounded-lg text-sm font-semibold" style={{ background: "rgba(237,31,36,0.1)", color: "#ED1F24" }}>Manager Review</span>
                    )}
                  </div>
                  {ev.score_reasoning && (
                    <div className="px-4 py-3 rounded-xl text-sm italic leading-relaxed"
                      style={{ color: "#64748b", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      "{ev.score_reasoning}"
                    </div>
                  )}
                </div>

                {ev.category_scores && Object.keys(ev.category_scores).length > 0 && (
                  <div>
                    <SectionLabel>Category Scores</SectionLabel>
                    <div className="grid grid-cols-3 gap-x-8 gap-y-3">
                      {Object.entries(ev.category_scores).map(([name, score]) => (
                        <CategoryBar key={name} name={name} score={score} />
                      ))}
                    </div>
                  </div>
                )}

                {ev.strengths?.length > 0 && (
                  <div>
                    <div className={`flex items-center gap-1.5 mb-3 ${sectionLabelStyle}`} style={{ color: "#43B749" }}>
                      <TrendingUp size={12} />
                      <span>Strengths</span>
                    </div>
                    <ul className="space-y-2.5">
                      {ev.strengths.map((s, i) => (
                        <li key={i} className="text-sm px-2.5 py-1.5 rounded-lg leading-snug"
                          style={{ color: "#94a3b8", background: "rgba(67,183,73,0.05)", border: "1px solid rgba(67,183,73,0.1)" }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {ev.missed_opportunities?.length > 0 && (
                  <div>
                    <div className={`flex items-center gap-1.5 mb-3 ${sectionLabelStyle}`} style={{ color: "#FCAF17" }}>
                      <TrendingDown size={12} />
                      <span>Missed Opportunities</span>
                    </div>
                    <ul className="space-y-3">
                      {ev.missed_opportunities.map((s, i) => (
                        <li key={i} className="text-sm px-2.5 py-2 rounded-lg leading-snug"
                          style={{ color: "#94a3b8", background: "rgba(252,175,23,0.05)", border: "1px solid rgba(252,175,23,0.1)" }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {ev.coaching_actions?.length > 0 && (
                  <div>
                    <SectionLabel color="#94a3b8">Coaching Actions</SectionLabel>
                    <ul className="grid grid-cols-3 gap-3">
                      {ev.coaching_actions.map((a, i) => {
                        const typeColor = a.type === "behavioral" ? "#307DC0" : a.type === "tactical" ? "#27679D" : "#43B749";
                        const typeBg   = a.type === "behavioral" ? "rgba(48,125,192,0.08)" : a.type === "tactical" ? "rgba(39,103,157,0.08)" : "rgba(67,183,73,0.08)";
                        return (
                          <li key={i} className="flex flex-col gap-2 text-sm px-3 py-2.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold capitalize self-start"
                              style={{ color: typeColor, background: typeBg }}>{a.type}</span>
                            <span style={{ color: "#94a3b8" }}>{a.action}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {ev.penalties?.length > 0 && (
                  <div>
                    <SectionLabel color="#ED1F24">Penalties</SectionLabel>
                    <ul className="space-y-2.5">
                      {ev.penalties.map((p, i) => (
                        <li key={i} className="text-sm px-3 py-2 rounded-lg"
                          style={{ color: "#94a3b8", background: "rgba(237,31,36,0.05)", border: "1px solid rgba(237,31,36,0.1)" }}>
                          <span className="font-semibold" style={{ color: "#ED1F24" }}>−{p.points}pts</span>
                          <span className="mx-1.5" style={{ color: "#334155" }}>·</span>
                          {p.type} — {p.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ev.evidence_snippets?.length > 0 && (
                  <div>
                    <SectionLabel color="#94a3b8">Evidence</SectionLabel>
                    <ul className="space-y-2.5">
                      {ev.evidence_snippets.map((e, i) => (
                        <li key={i} className="text-sm px-3 py-2.5 rounded-lg space-y-1.5"
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <p className="italic leading-snug" style={{ color: "#cbd5e1" }}>"{e.quote}"</p>
                          <p className="leading-snug" style={{ color: "#475569" }}>{e.why_it_matters}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ color: "#475569", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                {ev?.reason ?? "This call was not scored."}
              </div>
            )}

            {/* Transcript */}
            {call.transcript && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1.25rem" }}>
                <button
                  onClick={() => setShowTranscript((v) => !v)}
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors hover:text-slate-300"
                  style={{ color: "#94a3b8" }}>
                  <ChevronDown size={12} className={`transition-transform ${showTranscript ? "rotate-180" : ""}`} />
                  Transcript
                </button>
                {showTranscript && (
                  <div className="mt-3 px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: "#64748b", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", maxHeight: 320, overflowY: "auto" }}>
                    {call.transcript}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

const DIRECTIONS = [
  { value: "all",      label: "All Directions" },
  { value: "inbound",  label: "Inbound"  },
  { value: "outbound", label: "Outbound" },
] as const;

const DURATIONS = [
  { value: "all", label: "Any Duration" },
  { value: "1",   label: "1+ min"  },
  { value: "2",   label: "2+ min"  },
  { value: "5",   label: "5+ min"  },
  { value: "10",  label: "10+ min" },
  { value: "15",  label: "15+ min" },
] as const;

const ROLES = [
  { value: "all",  label: "All Roles" },
  { value: "fus",  label: "FUS" },
  { value: "acq",  label: "ACQ" },
  { value: "tc",   label: "TC"  },
  { value: "cc",   label: "CC"  },
  { value: "none", label: "None" },
] as const;

const SCORABLE_OPTS = [
  { value: "scorable", label: "Scorable Only" },
  { value: "all",       label: "All Calls"     },
] as const;

function meetsMinDuration(sec: number, minMinutes: typeof DURATIONS[number]["value"]): boolean {
  if (minMinutes === "all") return true;
  return sec >= Number(minMinutes) * 60;
}

export default function TrainingCoachClient({ calls, companies, accessRole, currentUserId }: Props) {
  const searchParams = useSearchParams();
  const [selected,  setSelected]  = useState<TrainingCall | null>(null);

  useEffect(() => {
    const callId = searchParams.get("callId");
    if (callId) {
      const match = calls.find(c => c.id === callId);
      if (match) setSelected(match);
    }
  }, []);
  const [companyId, setCompanyId] = useState<string>("all");
  const [agentIds,  setAgentIds]  = useState<string[]>(
    accessRole === "user" && currentUserId ? [currentUserId] : []
  );
  const [aiAgent,   setAiAgent]   = useState<string>("all");
  const [direction, setDirection] = useState<typeof DIRECTIONS[number]["value"]>("all");
  const [duration,  setDuration]  = useState<typeof DURATIONS[number]["value"]>("2");
  const [role,      setRole]      = useState<typeof ROLES[number]["value"]>("all");
  const [scorable,   setScorable]   = useState<typeof SCORABLE_OPTS[number]["value"]>("scorable");
  const [period,     setPeriod]     = useState<DatePeriod>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");

  const agents = useMemo(() => {
    const map = new Map<string, string>();
    calls.forEach((c) => {
      if (c.user_id && c.agent?.full_name) map.set(c.user_id, c.agent.full_name);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [calls]);

  const aiAgents = useMemo(() => {
    const set = new Set<string>();
    calls.forEach((c) => { if (c.ai_agent?.agent_name) set.add(c.ai_agent.agent_name); });
    return Array.from(set).sort();
  }, [calls]);

  const filtered = useMemo(() => calls.filter((c) => {
    if (companyId !== "all" && c.company_id !== companyId) return false;
    if (agentIds.length > 0 && !agentIds.includes(c.user_id)) return false;
    if (aiAgent !== "all" && c.ai_agent?.agent_name !== aiAgent) return false;
    if (direction !== "all" && c.direction !== direction) return false;
    if (duration !== "all" && !meetsMinDuration(c.duration_sec, duration)) return false;
    if (role !== "all" && (c.agent?.agent_type ?? "none") !== role) return false;
    if (scorable === "scorable" && !c.scorable) return false;
    const { from: pFrom, to: pTo } = periodBounds(period, customFrom, customTo);
    if (pFrom && new Date(c.created_at) < pFrom) return false;
    if (pTo   && new Date(c.created_at) > pTo)   return false;
    return true;
  }), [calls, companyId, agentIds, aiAgent, direction, duration, role, scorable, period, customFrom, customTo]);

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold gradient-text">Training Calls</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{calls.length} calls total</p>
        </div>
        <DateRangePicker
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          onPeriod={setPeriod}
          onCustomFrom={setCustomFrom}
          onCustomTo={setCustomTo}
          activeColor="#307DC0"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {agents.length > 1 && (
          <MultiSelect
            options={agents}
            selected={agentIds}
            onChange={setAgentIds}
            placeholder="Reps"
            className="min-w-[90px] py-1.5"
          />
        )}

        {accessRole === "super_admin" && companies.length > 0 && (
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger placeholder="All Companies" className="w-auto min-w-[140px] text-xs py-1.5" />
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {aiAgents.length > 0 && (
          <Select value={aiAgent} onValueChange={setAiAgent}>
            <SelectTrigger placeholder="AI Agent" className="w-auto min-w-[100px] text-xs py-1.5" />
            <SelectContent>
              <SelectItem value="all">All AI Agents</SelectItem>
              {aiAgents.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
          <SelectTrigger placeholder="Direction" className="w-auto min-w-[90px] text-xs py-1.5" />
          <SelectContent>
            {DIRECTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={duration} onValueChange={(v) => setDuration(v as typeof duration)}>
          <SelectTrigger placeholder="Duration" className="w-auto min-w-[90px] text-xs py-1.5" />
          <SelectContent>
            {DURATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
          <SelectTrigger placeholder="Role" className="w-auto min-w-[80px] text-xs py-1.5" />
          <SelectContent>
            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={scorable} onValueChange={(v) => setScorable(v as typeof scorable)}>
          <SelectTrigger placeholder="Scorable" className="w-auto min-w-[90px] text-xs py-1.5" />
          <SelectContent>
            {SCORABLE_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rep</TableHead>
              <TableHead>AI Agent</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell className="text-center py-16" style={{ color: "#334155" }} colSpan={7}>
                  <GraduationCap size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No training calls found</p>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{c.agent?.full_name ?? "Unknown"}</span>
                    {c.agent?.agent_type && c.agent.agent_type !== "none" && (
                      <Badge variant={c.agent.agent_type as any} />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>{c.ai_agent?.agent_name ?? "Unknown"}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {c.direction === "inbound"
                      ? <PhoneIncoming size={13} style={{ color: "#43B749" }} />
                      : <PhoneOutgoing size={13} style={{ color: "#307DC0" }} />}
                    <span className="text-xs capitalize" style={{ color: c.direction === "inbound" ? "#43B749" : "#307DC0" }}>
                      {c.direction}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono" style={{ color: "#64748b" }}>{fmtDuration(c.duration_sec)}</span>
                </TableCell>
                <TableCell><ScorePill score={c.score} /></TableCell>
                <TableCell>
                  <span className="text-xs" style={{ color: "#475569" }}>{c.call_stage ?? "—"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs" style={{ color: "#334155" }}>{fmt(c.created_at)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selected && <DetailModal call={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
