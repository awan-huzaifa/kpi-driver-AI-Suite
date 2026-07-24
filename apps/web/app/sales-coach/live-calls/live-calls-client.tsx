"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, PhoneIncoming, PhoneOutgoing, ExternalLink, X,
  TrendingUp, TrendingDown, ChevronDown, Search, ChevronRight,
  Mic, Target, Clock, Calendar, Download,
} from "lucide-react";
import AudioPlayer from "@/components/ui/AudioPlayer";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import { ExportModal, type ColDef } from "@/components/ui/export-modal";
import type { AccessRole } from "@/types/database";

/* ── Types ──────────────────────────────────────────────────────── */

interface CoachingAction { type: "behavioral" | "tactical" | "strategic"; action: string; }
interface EvidenceSnippet { quote: string; why_it_matters: string; }
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
  meta?: { call_id?: string | null; lead_id?: string | null; call_date?: string | null; lead_source?: string | null; known_outcome?: string | null; };
}

interface LiveCall {
  id:            string;
  user_id:       string;
  company_id:    string;
  contact_name:  string | null;
  contact_phone: string | null;
  agent_phone:   string;
  direction:     "inbound" | "outbound";
  duration_sec:  number;
  call_stage:    string | null;
  scorable:      boolean;
  score:         number | null;
  call_result:   string | null;
  transcript:    string | null;
  recording_url: string | null;
  crm_link:      string | null;
  evaluation:    Evaluation | null;
  created_at:    string;
  agent:         { full_name: string | null; agent_type: string; access_role: string } | null;
}

interface Props {
  calls:                 LiveCall[];
  companies:             { id: string; name: string }[];
  accessRole:            AccessRole;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function scoreColor(s: number | null): { color: string; rgb: string; bg: string } {
  if (s === null) return { color: "#475569", rgb: "71,85,105", bg: "rgba(71,85,105,0.1)" };
  if (s >= 80) return { color: "#43B749", rgb: "67,183,73",  bg: "rgba(67,183,73,0.1)"  };
  if (s >= 60) return { color: "#307DC0", rgb: "48,125,192", bg: "rgba(48,125,192,0.1)" };
  if (s >= 40) return { color: "#FCAF17", rgb: "252,175,23", bg: "rgba(252,175,23,0.1)" };
  return           { color: "#ED1F24", rgb: "237,31,36",  bg: "rgba(237,31,36,0.1)"  };
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

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ── Filter constants ────────────────────────────────────────────── */

const DIRECTIONS   = [{ value: "all", label: "All" }, { value: "inbound", label: "Inbound" }, { value: "outbound", label: "Outbound" }] as const;
const DURATIONS    = [{ value: "all", label: "Any" }, { value: "1", label: "1+ Min" }, { value: "2", label: "2+ Min" }, { value: "5", label: "5+ Min" }, { value: "10", label: "10+ Min" }, { value: "15", label: "15+ Min" }] as const;
const ROLES        = [{ value: "all", label: "All Roles" }, { value: "fus", label: "FUS" }, { value: "acq", label: "ACQ" }, { value: "tc", label: "TC" }, { value: "cc", label: "CC" }, { value: "dispo", label: "DISPO" }, { value: "dispo_fus", label: "DISPO FUS" }, { value: "tca", label: "TCA" }, { value: "none", label: "None" }] as const;
const SCORABLE_OPTS = [{ value: "scorable", label: "Scorable Only" }, { value: "all", label: "All Calls" }] as const;

function meetsMinDuration(sec: number, min: string) {
  if (min === "all") return true;
  return sec >= Number(min) * 60;
}

/* ── CATEGORY MAX ─────────────────────────────────────────────────── */

const CATEGORY_MAX: Record<string, number> = {
  "Rapport & Communication Quality": 15, "Qualification Completeness": 25,
  "Motivation Discovery Depth": 15, "Conversation Control & Structure": 10,
  "Objection Handling": 15, "Scheduling / Next Step Execution": 15, "Compliance & Guardrails": 5,
  "Rapport, Trust & Authority": 5, "Strategic Discovery & Deal Understanding": 20,
  "Motivation & Pain Extraction": 20, "Deal Control & Framing": 10,
  "Offer Strategy & Positioning": 15, "Objection Handling (Advanced)": 10,
  "Deal Advancement Decision Quality": 10, "Closing / Commitment Execution": 15,
};

/* ── Detail Modal ────────────────────────────────────────────────── */

function DetailModal({ call, onClose }: { call: LiveCall; onClose: () => void }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const ev = call.evaluation;
  const sc = scoreColor(call.score);

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "80px 24px 24px",
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{   opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 900, maxHeight: "calc(100vh - 104px)",
            display: "flex", flexDirection: "column",
            background: "#070f1a",
            border: "1px solid rgba(48,125,192,0.2)",
            borderRadius: 22,
            boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
            overflow: "hidden",
          }}
        >
          {/* ── Modal header ── */}
          <div style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(180deg, rgba(48,125,192,0.07) 0%, transparent 100%)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>

              {/* Left: contact + meta */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                {/* Score circle */}
                <div style={{
                  width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                  background: sc.bg, border: `2px solid ${sc.color}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 20px rgba(${sc.rgb},0.2)`,
                }}>
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
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
                      {call.contact_name ?? "Unknown Contact"}
                    </h2>
                    {/* Direction badge */}
                    <span style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                      ...(call.direction === "outbound"
                        ? { color: "#43B749", background: "rgba(67,183,73,0.12)", border: "1px solid rgba(67,183,73,0.2)" }
                        : { color: "#307DC0", background: "rgba(48,125,192,0.12)", border: "1px solid rgba(48,125,192,0.2)" }),
                    }}>
                      {call.direction === "outbound" ? <PhoneOutgoing size={9} /> : <PhoneIncoming size={9} />}
                      {call.direction.toUpperCase()}
                    </span>
                    {ev?.score_band && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: "#78ABD6", background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.15)" }}>
                        {ev.score_band}
                      </span>
                    )}
                    {ev?.manager_review_needed && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: "#ED1F24", background: "rgba(237,31,36,0.1)", border: "1px solid rgba(237,31,36,0.2)" }}>
                        Manager Review
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    {[
                      { icon: Phone,    val: call.contact_phone ?? "—"              },
                      { icon: Clock,    val: fmtDuration(call.duration_sec)          },
                      { icon: Calendar, val: `${fmtDate(call.created_at)} · ${fmtTime(call.created_at)}` },
                      { icon: Mic,      val: call.agent?.full_name ?? call.agent_phone },
                      ...(call.agent_phone ? [{ icon: Phone, val: `Agent: ${call.agent_phone}` }] : []),
                    ].map(({ icon: Icon, val }) => (
                      <span key={val} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569" }}>
                        <Icon size={10} />
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {call.crm_link && (
                  <a href={call.crm_link} target="_blank" rel="noopener noreferrer" style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600, color: "#307DC0", textDecoration: "none",
                    background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.2)",
                    padding: "6px 12px", borderRadius: 9,
                  }}>
                    <ExternalLink size={12} /> CRM
                  </a>
                )}
                <button onClick={onClose} style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer", color: "#475569",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s, color 0.15s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#475569"; }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Recording */}
            {call.recording_url && (
              <div style={{ marginTop: 14 }}>
                <AudioPlayer url={call.recording_url} />
              </div>
            )}
          </div>

          {/* ── Modal body ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Meta pills row */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.12 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { label: "Stage",       value: call.call_stage  ?? "—" },
                { label: "Result",      value: call.call_result ?? "—" },
                { label: "Agent Type",  value: call.agent?.agent_type
                    ? call.agent.agent_type === "none"
                      ? (call.agent.access_role === "admin" || call.agent.access_role === "super_admin" ? "Admin" : "User")
                      : call.agent.agent_type === "dispo_fus" ? "DISPO FUS" : call.agent.agent_type.toUpperCase()
                    : "—" },
                { label: "Opportunity", value: ev?.opportunity_level  ?? "—" },
                { label: "Call Type",   value: ev?.call_type          ?? "—" },
                { label: "Confidence",  value: ev?.confidence != null ? `${Math.round(ev.confidence * 100)}%` : "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0, textTransform: "capitalize" }}>{value}</p>
                </div>
              ))}
            </motion.div>

            {/* Score reasoning */}
            {ev?.score_reasoning && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.18 }}
                style={{
                padding: "14px 16px", borderRadius: 12, borderLeft: "3px solid rgba(48,125,192,0.4)",
                background: "rgba(48,125,192,0.04)", border: "1px solid rgba(48,125,192,0.1)",
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#307DC0", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Score Reasoning</p>
                <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>"{ev.score_reasoning}"</p>
              </motion.div>
            )}

            {/* Not scorable notice */}
            {!call.scorable && (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>{ev?.reason ?? "This Call Was Not Scored."}</p>
              </div>
            )}

            {/* Category scores */}
            {call.scorable && ev?.category_scores && Object.keys(ev.category_scores).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.24 }}>
                <SectionHeader icon={Target} label="Category Scores" color="#307DC0" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px", marginTop: 12 }}>
                  {Object.entries(ev.category_scores).map(([name, score], i) => {
                    const max = CATEGORY_MAX[name] ?? 100;
                    const pct = Math.min(100, Math.round((score / max) * 100));
                    const sc2 = scoreColor(pct);
                    return (
                      <div key={name}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>{name}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: sc2.color, fontVariantNumeric: "tabular-nums" }}>
                            {score}<span style={{ color: "#334155", fontWeight: 400 }}>/{max}</span>
                          </span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: 0.1 + i * 0.04, ease: "easeOut" }}
                            style={{
                              height: "100%", borderRadius: 99,
                              background: `linear-gradient(90deg, ${sc2.color}, rgba(${sc2.rgb},0.5))`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Strengths + Missed in 2 cols */}
            {call.scorable && ((ev?.strengths?.length ?? 0) > 0 || (ev?.missed_opportunities?.length ?? 0) > 0) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.30 }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {(ev?.strengths?.length ?? 0) > 0 && (
                  <div>
                    <SectionHeader icon={TrendingUp} label="Strengths" color="#43B749" />
                    <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                      {ev!.strengths.map((s, i) => (
                        <li key={i} style={{
                          fontSize: 12, color: "#94a3b8", lineHeight: 1.6,
                          padding: "8px 12px", borderRadius: 9,
                          background: "rgba(67,183,73,0.05)", border: "1px solid rgba(67,183,73,0.12)",
                          display: "flex", gap: 8,
                        }}>
                          <span style={{ color: "#43B749", flexShrink: 0, marginTop: 2 }}>✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(ev?.missed_opportunities?.length ?? 0) > 0 && (
                  <div>
                    <SectionHeader icon={TrendingDown} label="Missed Opportunities" color="#FCAF17" />
                    <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                      {ev!.missed_opportunities.map((s, i) => (
                        <li key={i} style={{
                          fontSize: 12, color: "#94a3b8", lineHeight: 1.6,
                          padding: "8px 12px", borderRadius: 9,
                          background: "rgba(252,175,23,0.05)", border: "1px solid rgba(252,175,23,0.12)",
                          display: "flex", gap: 8,
                        }}>
                          <span style={{ color: "#FCAF17", flexShrink: 0, marginTop: 2 }}>!</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            {/* Coaching actions */}
            {call.scorable && (ev?.coaching_actions?.length ?? 0) > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.36 }}>
                <SectionHeader icon={Mic} label="Coaching Actions" color="#94a3b8" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
                  {ev!.coaching_actions.map((a, i) => {
                    const tc = a.type === "behavioral" ? { color: "#307DC0", bg: "rgba(48,125,192,0.08)", border: "rgba(48,125,192,0.2)" }
                             : a.type === "tactical"   ? { color: "#FCAF17", bg: "rgba(252,175,23,0.06)",  border: "rgba(252,175,23,0.2)"  }
                             :                           { color: "#43B749", bg: "rgba(67,183,73,0.06)",   border: "rgba(67,183,73,0.2)"   };
                    return (
                      <div key={i} style={{
                        padding: "12px 14px", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8,
                        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 5, alignSelf: "flex-start",
                          textTransform: "uppercase", letterSpacing: "0.07em",
                          color: tc.color, background: tc.bg, border: `1px solid ${tc.border}`,
                        }}>
                          {a.type}
                        </span>
                        <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{a.action}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Penalties */}
            {call.scorable && (ev?.penalties?.length ?? 0) > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.42 }}>
                <SectionHeader label="Penalties" color="#ED1F24" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {ev!.penalties.map((p, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 14px", borderRadius: 10,
                      background: "rgba(237,31,36,0.04)", border: "1px solid rgba(237,31,36,0.12)",
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, color: "#ED1F24",
                        background: "rgba(237,31,36,0.12)", borderRadius: 6,
                        padding: "2px 7px", flexShrink: 0,
                      }}>−{p.points}pts</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                        <strong style={{ color: "#cbd5e1" }}>{p.type}</strong> — {p.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Evidence snippets */}
            {call.scorable && (ev?.evidence_snippets?.length ?? 0) > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.48 }}>
                <SectionHeader label="Evidence" color="#64748b" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  {ev!.evidence_snippets.map((e, i) => (
                    <div key={i} style={{
                      padding: "12px 14px", borderRadius: 12,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                    }}>
                      <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, margin: "0 0 6px", fontStyle: "italic" }}>"{e.quote}"</p>
                      <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.5, margin: 0 }}>{e.why_it_matters}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Transcript */}
            {call.transcript && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.52 }}
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                <button
                  onClick={() => setShowTranscript(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 700, color: "#475569",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                >
                  <ChevronDown size={13} style={{ transform: showTranscript ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  Transcript
                </button>
                {showTranscript && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{
                      marginTop: 10, padding: "14px 16px", borderRadius: 12,
                      fontSize: 12, color: "#64748b", lineHeight: 1.8, whiteSpace: "pre-wrap",
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                      maxHeight: 280, overflowY: "auto",
                    }}>
                      {call.transcript}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SectionHeader({ icon: Icon, label, color }: { icon?: React.ElementType; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {Icon && <Icon size={12} style={{ color }} />}
      <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</span>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

export default function LiveCallsClient({ calls, companies, accessRole }: Props) {
  const searchParams = useSearchParams();
  const [selected,   setSelected]   = useState<LiveCall | null>(null);

  useEffect(() => {
    const callId = searchParams.get("callId");
    if (callId) {
      const match = calls.find(c => c.id === callId);
      if (match) setSelected(match);
    }
  }, []);
  const [companyId,  setCompanyId]  = useState<string>("all");
  const [agentIds,   setAgentIds]   = useState<string[]>([]);
  const [search,     setSearch]     = useState("");
  const [direction,  setDirection]  = useState<string>("all");
  const [duration,   setDuration]   = useState<string>("2");
  const [role,       setRole]       = useState<string>("all");
  const [scorable,   setScorable]   = useState<string>("scorable");
  const [leadSource,  setLeadSource]  = useState<string>("all");
  const [period,      setPeriod]      = useState<DatePeriod>("today");
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");
  const [page,        setPage]        = useState(1);
  const [exportOpen,  setExportOpen]  = useState(false);

  const isAdmin = accessRole === "admin" || accessRole === "super_admin";

  const exportDefaultCols: ColDef<LiveCall>[] = [
    { label: "Date",        getValue: r => new Date(r.created_at).toLocaleDateString() },
    { label: "Time",        getValue: r => new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    { label: "Contact",     getValue: r => r.contact_name },
    { label: "Phone",       getValue: r => r.contact_phone },
    { label: "Agent",       getValue: r => r.agent?.full_name },
    { label: "Agent Type",  getValue: r => r.agent?.agent_type },
    { label: "Direction",   getValue: r => r.direction },
    { label: "Duration",    getValue: r => `${Math.floor(r.duration_sec / 60)}:${String(r.duration_sec % 60).padStart(2, "0")}` },
    { label: "Score",       getValue: r => r.score },
    { label: "Scorable",    getValue: r => r.scorable ? "Yes" : "No" },
    { label: "Result",      getValue: r => r.call_result },
    { label: "Stage",       getValue: r => r.call_stage },
    { label: "Lead Source", getValue: r => r.evaluation?.meta?.lead_source },
    { label: "CRM Link",    getValue: r => r.crm_link },
  ];
  const exportExtraCols: ColDef<LiveCall>[] = [
    { label: "Score Band",           getValue: r => r.evaluation?.score_band },
    { label: "Call Type",            getValue: r => r.evaluation?.call_type },
    { label: "Opportunity Level",    getValue: r => r.evaluation?.opportunity_level },
    { label: "Confidence",           getValue: r => r.evaluation?.confidence != null ? `${Math.round(r.evaluation.confidence * 100)}%` : null },
    { label: "Score Reasoning",      getValue: r => r.evaluation?.score_reasoning },
    { label: "Strengths",            getValue: r => r.evaluation?.strengths?.join("; ") },
    { label: "Missed Opportunities", getValue: r => r.evaluation?.missed_opportunities?.join("; ") },
    { label: "Coaching Actions",     getValue: r => r.evaluation?.coaching_actions?.map(a => `[${a.type}] ${a.action}`).join(" | ") },
    { label: "Penalties",            getValue: r => r.evaluation?.penalties?.map(p => `${p.type} -${p.points}pts: ${p.reason}`).join(" | ") },
    { label: "Transcript",           getValue: r => r.transcript },
  ];

  const agents = useMemo(() => {
    const map = new Map<string, string>();
    calls.forEach(c => { if (c.user_id && c.agent?.full_name) map.set(c.user_id, c.agent.full_name); });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [calls]);

  const leadSources = useMemo(() => {
    const set = new Set<string>();
    calls.forEach(c => { const ls = c.evaluation?.meta?.lead_source; if (ls) set.add(ls); });
    return Array.from(set).sort();
  }, [calls]);

  const filtered = useMemo(() => calls.filter(c => {
    if (companyId !== "all" && c.company_id !== companyId) return false;
    if (agentIds.length > 0 && !agentIds.includes(c.user_id)) return false;
    if (direction !== "all" && c.direction !== direction) return false;
    if (duration !== "all" && !meetsMinDuration(c.duration_sec, duration)) return false;
    if (role !== "all" && (c.agent?.agent_type ?? "none") !== role) return false;
    if (scorable === "scorable" && !c.scorable) return false;
    if (leadSource !== "all" && c.evaluation?.meta?.lead_source !== leadSource) return false;
    const { from: pFrom, to: pTo } = periodBounds(period, customFrom, customTo);
    if (pFrom && new Date(c.created_at) < pFrom) return false;
    if (pTo   && new Date(c.created_at) > pTo)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(c.contact_name ?? "").toLowerCase().includes(q) &&
          !(c.contact_phone ?? "").includes(q) &&
          !(c.agent?.full_name ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [calls, companyId, agentIds, direction, duration, role, scorable, leadSource, period, customFrom, customTo, search]);

  const PAGE_SIZE  = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const avgScore = useMemo(() => {
    const scored = filtered.filter(c => c.score !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, c) => s + c.score!, 0) / scored.length);
  }, [filtered]);

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 9, color: "#e2e8f0", outline: "none", fontSize: 12,
    padding: "7px 12px", transition: "border-color 0.15s",
  };

  return (
    <div style={{ padding: "28px 32px" }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Phone size={12} style={{ color: "#307DC0" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#307DC0", textTransform: "uppercase", letterSpacing: "0.09em" }}>Live Calls</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
              Call Log
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              {calls.length} Calls Total. Click Any Row To View Scoring Details.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, flexShrink: 0 }}>
            {/* Summary stats */}
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "Showing",    value: String(filtered.length),          color: "#fff"     },
                { label: "Avg Score",  value: avgScore !== null ? String(avgScore) : "—", color: avgScore !== null ? scoreColor(avgScore).color : "#475569" },
                { label: "Scorable",   value: `${filtered.filter(c => c.scorable).length}`, color: "#43B749" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "10px 16px", textAlign: "center", minWidth: 72,
                }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color, margin: "0 0 2px", letterSpacing: "-0.02em" }}>{value}</p>
                  <p style={{ fontSize: 10, color: "#475569", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                </div>
              ))}
            </div>
            {/* Company filter + date picker in same row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {accessRole === "super_admin" && companies.length > 0 && (
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger placeholder="All Companies" className="w-auto min-w-[160px] text-xs py-2" />
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
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
          </div>
        </div>
      </motion.div>

      {/* ── Filters ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14, padding: "14px 16px", marginBottom: 20,
          display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={12} style={{ position: "absolute", left: 10, color: "#334155", pointerEvents: "none" }} />
          <input
            placeholder="Search contact, agent…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 28, width: 180 }}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(48,125,192,0.4)")}
            onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#475569", display: "flex" }}>
              <X size={11} />
            </button>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.06)" }} />

        {/* Agent */}
        {agents.length > 1 && (
          <MultiSelect options={agents} selected={agentIds} onChange={setAgentIds} placeholder="Agents" className="min-w-[90px] py-1.5" />
        )}

        <Select value={direction} onValueChange={setDirection}>
          <SelectTrigger placeholder="Direction" className="w-auto min-w-[90px] text-xs py-1.5" />
          <SelectContent>{DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger placeholder="Duration" className="w-auto min-w-[90px] text-xs py-1.5" />
          <SelectContent>{DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={role} onValueChange={setRole}>
          <SelectTrigger placeholder="Role" className="w-auto min-w-[80px] text-xs py-1.5" />
          <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={scorable} onValueChange={setScorable}>
          <SelectTrigger placeholder="Scorable" className="w-auto min-w-[90px] text-xs py-1.5" />
          <SelectContent>{SCORABLE_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>

        {leadSources.length > 0 && (
          <Select value={leadSource} onValueChange={setLeadSource}>
            <SelectTrigger placeholder="Lead Source" className="w-auto min-w-[100px] text-xs py-1.5" />
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {leadSources.map(ls => <SelectItem key={ls} value={ls}>{ls}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {isAdmin && (
          <button
            onClick={() => setExportOpen(true)}
            style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
              padding: "7px 13px", borderRadius: 9, cursor: "pointer",
              background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.25)",
              color: "#307DC0", fontSize: 12, fontWeight: 700,
            }}
          >
            <Download size={12} /> Export
          </button>
        )}
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {["Date", "Contact", "Agent", "Direction", "Duration", "Score", "Result", "Stage", "Lead Source", "CRM Link"].map((h) => (
                <th key={h} style={{
                  padding: "11px 14px", textAlign: "center",
                  fontSize: 10, fontWeight: 800, color: "#e2e8f0",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>{h}</th>
              ))}
              <th style={{ width: 28 }} />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} style={{ padding: "60px 16px", textAlign: "center" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, margin: "0 auto 10px",
                    background: "rgba(48,125,192,0.08)", border: "1px solid rgba(48,125,192,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Phone size={18} style={{ color: "#334155" }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#334155", margin: "0 0 4px" }}>No Calls Found</p>
                  <p style={{ fontSize: 12, color: "#1e293b", margin: 0 }}>Try Adjusting Your Filters.</p>
                </td>
              </tr>
            )}
            {pageRows.map((c, i) => {
              const sc = scoreColor(c.score);
              const rs = resultStyle(c.call_result);
              const agentName = c.agent?.full_name ?? c.agent_phone;
              return (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.025, 0.35) }}
                  onClick={() => setSelected(c)}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    cursor: "pointer", transition: "background 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(48,125,192,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Date */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", margin: "0 0 1px" }}>{fmtDate(c.created_at)}</p>
                    <p style={{ fontSize: 10, fontWeight: 500, color: "#475569", margin: 0 }}>{fmtTime(c.created_at)}</p>
                  </td>

                  {/* Contact */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: "0 0 2px" }}>
                      {c.contact_name ?? "Unknown"}
                    </p>
                    <p style={{ fontSize: 11, fontFamily: "monospace", color: "#475569", margin: 0 }}>
                      {c.contact_phone ?? "—"}
                    </p>
                  </td>

                  {/* Agent */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", margin: "0 0 2px" }}>{agentName}</p>
                    {c.agent?.agent_type && (
                      <Badge variant={
                        c.agent.agent_type === "none"
                          ? (c.agent.access_role === "admin" || c.agent.access_role === "super_admin" ? "admin" : "user")
                          : c.agent.agent_type as any
                      } />
                    )}
                  </td>

                  {/* Direction */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                      ...(c.direction === "outbound"
                        ? { color: "#43B749", background: "rgba(67,183,73,0.1)", border: "1px solid rgba(67,183,73,0.2)" }
                        : { color: "#307DC0", background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.2)" }),
                    }}>
                      {c.direction === "outbound" ? <PhoneOutgoing size={10} /> : <PhoneIncoming size={10} />}
                      {c.direction === "outbound" ? "OUT" : "IN"}
                    </span>
                  </td>

                  {/* Duration */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: "#94a3b8" }}>{fmtDuration(c.duration_sec)}</span>
                  </td>

                  {/* Score */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    {c.score !== null ? (
                      <span style={{
                        display: "inline-block", fontSize: 13, fontWeight: 900,
                        color: sc.color, background: sc.bg,
                        padding: "2px 10px", borderRadius: 99, minWidth: 38, textAlign: "center",
                        border: `1px solid rgba(${sc.rgb},0.25)`,
                      }}>
                        {c.score}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#334155" }}>—</span>
                    )}
                  </td>

                  {/* Result */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                      color: rs.color, background: rs.bg, whiteSpace: "nowrap",
                    }}>
                      {c.call_result ?? "—"}
                    </span>
                  </td>

                  {/* Stage */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{c.call_stage ?? "—"}</span>
                  </td>

                  {/* Lead Source */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    {c.evaluation?.meta?.lead_source ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                        color: "#FCAF17", background: "rgba(252,175,23,0.1)", border: "1px solid rgba(252,175,23,0.2)",
                        whiteSpace: "nowrap",
                      }}>
                        {c.evaluation.meta.lead_source}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#334155" }}>—</span>
                    )}
                  </td>

                  {/* CRM Link */}
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    {c.crm_link ? (
                      <a
                        href={c.crm_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 11, fontWeight: 600, color: "#307DC0",
                          textDecoration: "none", padding: "4px 8px", borderRadius: 7,
                          background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.2)",
                        }}
                      >
                        <ExternalLink size={11} /> CRM
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "#334155" }}>—</span>
                    )}
                  </td>

                  {/* Arrow */}
                  <td style={{ padding: "12px 10px", width: 28 }}>
                    <ChevronRight size={13} style={{ color: "#334155" }} />
                  </td>
                </motion.tr>
              );
            })}
            </AnimatePresence>
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>
            {filtered.length === 0 ? "0 calls" : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          {filtered.length > PAGE_SIZE && (
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} style={{
                  minWidth: 30, height: 30, borderRadius: 8, border: "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: p === safePage ? "#307DC0" : "rgba(255,255,255,0.04)",
                  color: p === safePage ? "#fff" : "#475569",
                  transition: "background 0.15s",
                }}>{p}</button>
              ))}
            </div>
          )}
          {filtered.length > PAGE_SIZE && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{
                padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 12, fontWeight: 600, background: "transparent",
                cursor: safePage === 1 ? "default" : "pointer",
                color: safePage === 1 ? "#334155" : "#94a3b8", opacity: safePage === 1 ? 0.4 : 1,
              }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{
                padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 12, fontWeight: 600, background: "transparent",
                cursor: safePage === totalPages ? "default" : "pointer",
                color: safePage === totalPages ? "#334155" : "#94a3b8", opacity: safePage === totalPages ? 0.4 : 1,
              }}>Next →</button>
            </div>
          )}
        </div>
      </motion.div>

      {selected && <DetailModal call={selected} onClose={() => setSelected(null)} />}
      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          data={calls as unknown as Record<string, unknown>[]}
          defaultCols={exportDefaultCols as unknown as ColDef<Record<string, unknown>>[]}
          extraCols={exportExtraCols as unknown as ColDef<Record<string, unknown>>[]}
          filenamePrefix="live-calls"
        />
      )}
    </div>
  );
}
