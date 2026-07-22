"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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
  call_result:   string | null;
  from_phone:    string | null;
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

function resultStyle(r: string | null) {
  if (!r) return { color: "#64748b", bg: "rgba(100,116,139,0.08)" };
  const l = r.toLowerCase();
  if (l.includes("book") || l.includes("converted") || l.includes("signed"))
    return { color: "#43B749", bg: "rgba(67,183,73,0.1)" };
  if (l.includes("not") || l.includes("disqualif"))
    return { color: "#ED1F24", bg: "rgba(237,31,36,0.1)" };
  if (l.includes("follow") || l.includes("nurture"))
    return { color: "#FCAF17", bg: "rgba(252,175,23,0.1)" };
  return { color: "#64748b", bg: "rgba(100,116,139,0.08)" };
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

function scoreColor(score: number | null) {
  if (score === null || score < 40) return { color: "#ED1F24", bg: "rgba(237,31,36,0.1)",   rgb: "237,31,36"  };
  if (score < 60)                   return { color: "#FCAF17", bg: "rgba(252,175,23,0.1)", rgb: "252,175,23" };
  if (score < 80)                   return { color: "#307DC0", bg: "rgba(48,125,192,0.1)", rgb: "48,125,192" };
  return                                   { color: "#43B749", bg: "rgba(67,183,73,0.1)",  rgb: "67,183,73"  };
}

function DetailModal({ call, onClose }: { call: TrainingCall; onClose: () => void }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const ev = call.evaluation;
  const sc = scoreColor(call.score);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 24px 24px" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 900, maxHeight: "calc(100vh - 104px)", display: "flex", flexDirection: "column", background: "#070f1a", border: "1px solid rgba(48,125,192,0.2)", borderRadius: 22, boxShadow: "0 40px 100px rgba(0,0,0,0.7)", overflow: "hidden" }}
      >
        {/* ── Header ── */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(180deg, rgba(48,125,192,0.07) 0%, transparent 100%)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              {/* Score circle */}
              <div style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0, background: sc.bg, border: `2px solid ${sc.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px rgba(${sc.rgb},0.2)` }}>
                {call.score !== null ? (
                  <>
                    <span style={{ fontSize: 18, fontWeight: 900, color: sc.color, lineHeight: 1 }}>{call.score}</span>
                    <span style={{ fontSize: 9, color: sc.color, opacity: 0.7, fontWeight: 600 }}>/100</span>
                  </>
                ) : (
                  <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>N/A</span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>{call.agent?.full_name ?? "Unknown Rep"}</h2>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: "#94a3b8", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    vs {call.ai_agent?.agent_name ?? "Unknown AI Agent"}
                  </span>
                  {ev?.score_band && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: "#78ABD6", background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.15)" }}>{ev.score_band}</span>}
                  {ev?.manager_review_needed && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: "#ED1F24", background: "rgba(237,31,36,0.1)", border: "1px solid rgba(237,31,36,0.2)" }}>Manager Review</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  {[
                    { label: fmtDuration(call.duration_sec) },
                    { label: fmt(call.created_at) },
                  ].map(({ label }) => (
                    <span key={label} style={{ fontSize: 11, color: "#475569" }}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#475569"; }}
            ><X size={14} /></button>
          </div>
          {call.recording_url && <div style={{ marginTop: 14 }}><AudioPlayer url={call.recording_url} /></div>}
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { label: "Rep",         value: call.agent?.full_name     ?? "—" },
              { label: "Agent Role",  value: (call.agent?.agent_type ?? "—").toUpperCase() },
              { label: "Agent Phone", value: call.from_phone           ?? "—" },
              { label: "AI Agent",    value: call.ai_agent?.agent_name ?? "—" },
              { label: "Call Result", value: call.call_result          ?? "—" },
              { label: "Time",        value: fmt(call.created_at)               },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0, textTransform: "capitalize" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Call summary */}
          {call.call_summary && (
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Summary</p>
              <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>{call.call_summary}</p>
            </div>
          )}

          {/* Not scorable */}
          {!call.scorable && (
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(237,31,36,0.06)", border: "1px solid rgba(237,31,36,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ED1F24", flexShrink: 0 }} />
                <p style={{ fontSize: 10, fontWeight: 700, color: "#ED1F24", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Non-Scorable</p>
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{ev?.reason ?? "This Call Was Not Scored."}</p>
            </div>
          )}

          {/* Score reasoning */}
          {call.scorable && ev?.score_reasoning && (
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(48,125,192,0.04)", border: "1px solid rgba(48,125,192,0.1)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#307DC0", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Score Reasoning</p>
              <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>"{ev.score_reasoning}"</p>
            </div>
          )}

          {/* Category scores */}
          {call.scorable && ev?.category_scores && Object.keys(ev.category_scores).length > 0 && (
            <div>
              <SectionLabel>Category Scores</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px", marginTop: 12 }}>
                {Object.entries(ev.category_scores).map(([name, score]) => (
                  <CategoryBar key={name} name={name} score={score} />
                ))}
              </div>
            </div>
          )}

          {/* Strengths + Missed */}
          {call.scorable && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {(ev?.strengths?.length ?? 0) > 0 && (
                <div>
                  <div className={`flex items-center gap-1.5 mb-3 ${sectionLabelStyle}`} style={{ color: "#43B749" }}><TrendingUp size={12} /><span>Strengths</span></div>
                  <ul className="space-y-2">
                    {ev!.strengths.map((s, i) => (
                      <li key={i} style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, color: "#94a3b8", background: "rgba(67,183,73,0.05)", border: "1px solid rgba(67,183,73,0.1)", lineHeight: 1.5 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(ev?.missed_opportunities?.length ?? 0) > 0 && (
                <div>
                  <div className={`flex items-center gap-1.5 mb-3 ${sectionLabelStyle}`} style={{ color: "#FCAF17" }}><TrendingDown size={12} /><span>Missed Opportunities</span></div>
                  <ul className="space-y-2">
                    {ev!.missed_opportunities.map((s, i) => (
                      <li key={i} style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, color: "#94a3b8", background: "rgba(252,175,23,0.05)", border: "1px solid rgba(252,175,23,0.1)", lineHeight: 1.5 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Coaching actions */}
          {call.scorable && (ev?.coaching_actions?.length ?? 0) > 0 && (
            <div>
              <SectionLabel color="#94a3b8">Coaching Actions</SectionLabel>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 10 }}>
                {ev!.coaching_actions.map((a, i) => {
                  const typeColor = a.type === "behavioral" ? "#307DC0" : a.type === "tactical" ? "#27679D" : "#43B749";
                  const typeBg   = a.type === "behavioral" ? "rgba(48,125,192,0.08)" : a.type === "tactical" ? "rgba(39,103,157,0.08)" : "rgba(67,183,73,0.08)";
                  return (
                    <li key={i} style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, color: typeColor, background: typeBg, alignSelf: "flex-start", textTransform: "capitalize" }}>{a.type}</span>
                      <span style={{ color: "#94a3b8", lineHeight: 1.5 }}>{a.action}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Penalties */}
          {call.scorable && (ev?.penalties?.length ?? 0) > 0 && (
            <div>
              <SectionLabel color="#ED1F24">Penalties</SectionLabel>
              <ul className="space-y-2" style={{ marginTop: 10 }}>
                {ev!.penalties.map((p, i) => (
                  <li key={i} style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, color: "#94a3b8", background: "rgba(237,31,36,0.05)", border: "1px solid rgba(237,31,36,0.1)" }}>
                    <span style={{ fontWeight: 700, color: "#ED1F24" }}>−{p.points}pts</span>
                    <span style={{ margin: "0 6px", color: "#334155" }}>·</span>
                    {p.type} — {p.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence */}
          {call.scorable && (ev?.evidence_snippets?.length ?? 0) > 0 && (
            <div>
              <SectionLabel color="#94a3b8">Evidence</SectionLabel>
              <ul className="space-y-2" style={{ marginTop: 10 }}>
                {ev!.evidence_snippets.map((e, i) => (
                  <li key={i} style={{ fontSize: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ fontStyle: "italic", color: "#cbd5e1", margin: "0 0 4px", lineHeight: 1.5 }}>"{e.quote}"</p>
                    <p style={{ color: "#475569", margin: 0, lineHeight: 1.5 }}>{e.why_it_matters}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
              <button onClick={() => setShowTranscript((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
                <ChevronDown size={12} style={{ transform: showTranscript ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                Transcript
              </button>
              {showTranscript && (
                <div style={{ marginTop: 10, padding: "12px 16px", borderRadius: 12, fontSize: 12, color: "#64748b", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>
                  {call.transcript}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const DIRECTIONS = [
  { value: "all",      label: "All Directions" },
  { value: "inbound",  label: "Inbound"  },
  { value: "outbound", label: "Outbound" },
] as const;

const DURATIONS = [
  { value: "all", label: "Any Duration" },
  { value: "1",   label: "1+ Min"  },
  { value: "2",   label: "2+ Min"  },
  { value: "5",   label: "5+ Min"  },
  { value: "10",  label: "10+ Min" },
  { value: "15",  label: "15+ Min" },
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
  const [agentIds,  setAgentIds]  = useState<string[]>([]);
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
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{calls.length} Calls Total</p>
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
              <TableHead className="font-extrabold tracking-wide text-center" style={{ color: "#e2e8f0" }}>Date</TableHead>
              <TableHead className="font-extrabold tracking-wide text-center" style={{ color: "#e2e8f0" }}>Rep</TableHead>
              <TableHead className="font-extrabold tracking-wide text-center" style={{ color: "#e2e8f0" }}>AI Agent</TableHead>
              <TableHead className="font-extrabold tracking-wide text-center" style={{ color: "#e2e8f0" }}>Duration</TableHead>
              <TableHead className="font-extrabold tracking-wide text-center" style={{ color: "#e2e8f0" }}>Score</TableHead>
              <TableHead className="font-extrabold tracking-wide text-center" style={{ color: "#e2e8f0" }}>Scorable</TableHead>
              <TableHead className="font-extrabold tracking-wide text-center" style={{ color: "#e2e8f0" }}>Reason</TableHead>
              <TableHead className="font-extrabold tracking-wide text-center" style={{ color: "#e2e8f0" }}>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell className="text-center py-16" style={{ color: "#334155" }} colSpan={8}>
                  <GraduationCap size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No Training Calls Found</p>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                <TableCell className="text-center">
                  <span className="text-xs" style={{ color: "#334155" }}>{fmt(c.created_at)}</span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-medium text-white">{c.agent?.full_name ?? "Unknown"}</span>
                    {c.agent?.agent_type && c.agent.agent_type !== "none" && (
                      <Badge variant={c.agent.agent_type as any} />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-xs" style={{ color: "#94a3b8" }}>{c.ai_agent?.agent_name ?? "Unknown"}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-xs font-mono" style={{ color: "#64748b" }}>{fmtDuration(c.duration_sec)}</span>
                </TableCell>
                <TableCell className="text-center"><ScorePill score={c.score} /></TableCell>
                <TableCell className="text-center">
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                    color: c.scorable ? "#43B749" : "#ED1F24",
                    background: c.scorable ? "rgba(67,183,73,0.1)" : "rgba(237,31,36,0.1)",
                  }}>
                    {c.scorable ? "Yes" : "No"}
                  </span>
                </TableCell>
                <TableCell className="text-center" style={{ maxWidth: 200 }}>
                  {(() => {
                    const reason = c.evaluation?.reason ?? (c.scorable ? null : "Not Scored")
                    if (!reason) return <span style={{ color: "#475569", fontSize: 11 }}>—</span>
                    const truncated = reason.length > 40 ? reason.slice(0, 40) + "…" : reason
                    return (
                      <span title={reason} style={{ fontSize: 11, color: "#94a3b8", cursor: reason.length > 40 ? "help" : "default" }}>
                        {truncated}
                      </span>
                    )
                  })()}
                </TableCell>
                <TableCell className="text-center">
                  {(() => { const rs = resultStyle(c.call_result); return (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, color: rs.color, background: rs.bg, whiteSpace: "nowrap" }}>
                      {c.call_result ?? "—"}
                    </span>
                  ); })()}
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
