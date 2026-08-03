"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  NotebookPen, PhoneIncoming, PhoneOutgoing, Phone,
  X, ChevronDown, Search, Coins, ExternalLink, Copy, Check,
} from "lucide-react";
import { C } from "@/components/platform/brand";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { ExportModal, type ColDef } from "@/components/ui/export-modal";
import type { AccessRole } from "@/types/database";

interface NoteCall {
  id:              string;
  company_id:      string;
  call_direction:  string | null;
  to_number:       string | null;
  from_number:     string | null;
  contact_phone:   string | null;
  agent_phone:     string | null;
  agent_name:      string | null;
  lead_source:     string | null;
  crm_link:        string | null;
  custom_fields:   { key: string; value: unknown }[];
  ai_summary:      string | null;
  normal_summary:  string | null;
  transcript:      string | null;
  input_tokens:    number;
  output_tokens:   number;
  cost_usd:        number;
  created_at:      string;
}

interface Props {
  calls:      NoteCall[];
  companies:  { id: string; name: string }[];
  accessRole: AccessRole;
}

const DIRECTIONS = [
  { label: "All",      value: "all"      },
  { label: "Inbound",  value: "inbound"  },
  { label: "Outbound", value: "outbound" },
] as const;
type Direction = typeof DIRECTIONS[number]["value"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmt(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString("default", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtCost(c: number) {
  return `$${c.toFixed(4)}`;
}

function DirectionIcon({ dir }: { dir: string | null }) {
  if (dir === "inbound")  return <PhoneIncoming  size={13} style={{ color: C.green }} />;
  if (dir === "outbound") return <PhoneOutgoing  size={13} style={{ color: C.blue  }} />;
  return <Phone size={13} style={{ color: C.dimText }} />;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy"
      style={{
        background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
        color: copied ? C.green : C.dimText, flexShrink: 0, opacity: 0.7,
        transition: "color 0.2s, opacity 0.2s",
        display: "flex", alignItems: "center",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = copied ? "1" : "0.7")}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function DirectionBadge({ dir }: { dir: string | null }) {
  const cfg = dir === "inbound"
    ? { label: "Inbound",  color: C.green, bg: "rgba(67,183,73,0.12)",   border: "rgba(67,183,73,0.25)"   }
    : dir === "outbound"
    ? { label: "Outbound", color: C.blue,  bg: "rgba(48,125,192,0.12)",  border: "rgba(48,125,192,0.25)"  }
    : { label: "Unknown",  color: C.dimText, bg: "rgba(139,156,176,0.08)", border: "rgba(139,156,176,0.15)" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700,
      padding: "3px 8px", borderRadius: 99,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>
      <DirectionIcon dir={dir} />
      {cfg.label}
    </span>
  );
}

/* ── Detail Modal ─────────────────────────────────────────────────── */

function DetailModal({ call, onClose, accessRole }: { call: NoteCall; onClose: () => void; accessRole: AccessRole }) {
  const [showTranscript, setShowTranscript] = useState(false);
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
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "80px 24px 24px",
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{   opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto",
            background: "#0f1f30",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "28px 32px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <NotebookPen size={18} style={{ color: C.blue }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: 0 }}>
                  Call Note
                </p>
                <p style={{ fontSize: 12, color: C.dimText, margin: "2px 0 0" }}>
                  {fmt(call.created_at)}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {call.crm_link && (
                <a
                  href={call.crm_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600, color: "#307DC0", textDecoration: "none",
                    background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.2)",
                    padding: "6px 12px", borderRadius: 9,
                  }}
                >
                  <ExternalLink size={12} /> CRM
                </a>
              )}
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.dimText, padding: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.dimText)}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24,
          }}>
            {[
              { label: "Agent",         value: call.agent_name    ?? "—"                    },
              { label: "Agent Phone",   value: call.agent_phone   ?? "—"                    },
              { label: "Direction",     value: <DirectionBadge dir={call.call_direction} /> },
              { label: "Contact Phone", value: call.contact_phone ?? "—"                    },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10, padding: "12px 14px",
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
                  {label}
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Token / cost row */}
          <div style={{
            display: "flex", gap: 12, marginBottom: 24,
          }}>
            {[
              { label: "Input Tokens",  value: call.input_tokens.toLocaleString()  },
              { label: "Output Tokens", value: call.output_tokens.toLocaleString() },
              ...(accessRole !== "user" ? [{ label: "AI Cost", value: fmtCost(call.cost_usd) }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{
                flex: 1, background: "rgba(48,125,192,0.06)", border: "1px solid rgba(48,125,192,0.15)",
                borderRadius: 10, padding: "10px 14px",
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>
                  {label}
                </p>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.blue, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          {call.ai_summary && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                AI Summary
              </p>
              <div style={{
                background: "rgba(67,183,73,0.05)", border: "1px solid rgba(67,183,73,0.15)",
                borderRadius: 12, padding: "16px 18px",
              }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#cbd5e1", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                  {call.ai_summary}
                </p>
              </div>
            </div>
          )}

          {/* Normal Summary */}
          {call.normal_summary && (
            <div style={{ marginBottom: call.custom_fields?.length ? 20 : 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Call Summary
              </p>
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "16px 18px",
              }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                  {call.normal_summary}
                </p>
              </div>
            </div>
          )}

          {/* Custom Fields */}
          {call.custom_fields?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                CRM Fields
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {call.custom_fields.map((f, i) => {
                  const displayVal = Array.isArray(f.value)
                    ? (f.value as unknown[]).join(", ")
                    : String(f.value ?? "—");
                  const label = f.key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "flex-start",
                        background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                        borderRadius: 8, padding: "10px 12px",
                        border: "1px solid transparent",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(48,125,192,0.12)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(48,125,192,0.04)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "transparent"; (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"; }}
                    >
                      <div style={{ width: "36%", flexShrink: 0, paddingRight: 16 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: C.blue,
                          background: "rgba(48,125,192,0.08)", borderRadius: 5,
                          padding: "2px 8px", display: "inline-block",
                        }}>
                          {label}
                        </span>
                      </div>
                      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.bodyText, wordBreak: "break-word", flex: 1 }}>
                          {displayVal}
                        </span>
                        {displayVal !== "—" && <CopyButton value={displayVal} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

export default function NoteTakerClient({ calls, companies, accessRole }: Props) {
  const searchParams = useSearchParams();
  const [period,     setPeriod]     = useState<DatePeriod>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [companyId,   setCompanyId]   = useState<string>("all");
  const [direction,   setDirection]   = useState<Direction>("all");
  const [agentFilter,      setAgentFilter]      = useState<string>("all");
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>("all");
  const [search,           setSearch]           = useState("");
  const [selected,         setSelected]         = useState<NoteCall | null>(null);
  const [page,             setPage]             = useState(1);
  const [exportOpen,       setExportOpen]       = useState(false);

  const isAdmin = accessRole === "admin" || accessRole === "super_admin";

  const exportDefaultCols: ColDef<NoteCall>[] = [
    { label: "Date",          getValue: r => new Date(r.created_at).toLocaleDateString() },
    { label: "Time",          getValue: r => new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    { label: "Agent",         getValue: r => r.agent_name },
    { label: "Direction",     getValue: r => r.call_direction ? r.call_direction.charAt(0).toUpperCase() + r.call_direction.slice(1) : null },
    { label: "Contact Phone", getValue: r => r.contact_phone },
    { label: "Agent Phone",   getValue: r => r.agent_phone },
    { label: "Lead Source",   getValue: r => r.lead_source },
    { label: "Cost ($)",      getValue: r => r.cost_usd },
  ];
  const exportExtraCols: ColDef<NoteCall>[] = [
    { label: "AI Summary",     getValue: r => r.ai_summary },
    { label: "Normal Summary", getValue: r => r.normal_summary },
    { label: "Input Tokens",   getValue: r => r.input_tokens },
    { label: "Output Tokens",  getValue: r => r.output_tokens },
  ];

  const agentNames = useMemo(() => {
    const names = calls.map(c => c.agent_name).filter((n): n is string => !!n);
    return [...new Set(names)].sort();
  }, [calls]);

  const leadSources = useMemo(() => {
    const sources = calls.map(c => c.lead_source).filter((s): s is string => !!s);
    return [...new Set(sources)].sort();
  }, [calls]);

  useEffect(() => {
    const callId = searchParams.get("callId");
    if (callId) {
      const match = calls.find(c => c.id === callId);
      if (match) setSelected(match);
    }
  }, []);

  const filtered = useMemo(() => {
    const { from: start, to: end } = periodBounds(period, customFrom, customTo);
    return calls.filter((c) => {
      if (companyId !== "all" && c.company_id !== companyId) return false;
      if (start && new Date(c.created_at) < start) return false;
      if (end   && new Date(c.created_at) > end)   return false;
      if (direction !== "all" && c.call_direction !== direction) return false;
      if (agentFilter !== "all" && c.agent_name !== agentFilter) return false;
      if (leadSourceFilter !== "all" && c.lead_source !== leadSourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.agent_name?.toLowerCase().includes(q) &&
          !c.from_number?.toLowerCase().includes(q) &&
          !c.to_number?.toLowerCase().includes(q) &&
          !c.ai_summary?.toLowerCase().includes(q) &&
          !c.normal_summary?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [calls, companyId, period, customFrom, customTo, direction, agentFilter, leadSourceFilter, search]);

  const PAGE_SIZE  = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalCost = filtered.reduce((s, c) => s + (c.cost_usd ?? 0), 0);

  return (
    <div style={{ padding: "32px 36px" }}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 28 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <NotebookPen size={16} style={{ color: C.blue }} />
          <p style={{ fontSize: 11, fontWeight: 700, color: C.blue, margin: 0, letterSpacing: "0.09em", textTransform: "uppercase" }}>
            AI Note Taker
          </p>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.white, letterSpacing: "-0.02em", margin: 0 }}>
          Notes
        </h1>
        <p style={{ fontSize: 13, color: C.bodyText, marginTop: 6 }}>
          All Call Notes. Click Any Row To View The Full Transcript.
        </p>
      </motion.div>

      {/* Filter card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "16px 20px", marginBottom: 20,
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        {/* Row 1 — filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Date range */}
          <DateRangePicker
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            onPeriod={setPeriod}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
            activeColor={C.blue}
          />

          {/* Company — super_admin only */}
          {accessRole === "super_admin" && companies.length > 0 && (
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger placeholder="All Companies" className="w-auto min-w-[140px] text-xs py-1.5" />
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {/* Direction */}
          <div style={{ display: "flex", gap: 4 }}>
            {DIRECTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDirection(d.value)}
                style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                  background: direction === d.value ? "rgba(48,125,192,0.18)" : "rgba(255,255,255,0.04)",
                  color:      direction === d.value ? C.blue : C.mutedText,
                  border:     `1px solid ${direction === d.value ? "rgba(48,125,192,0.4)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Agent filter */}
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger placeholder="All Agents" className="w-auto min-w-[130px] text-xs py-1.5" />
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agentNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Lead Source filter */}
          {leadSources.length > 0 && (
            <Select value={leadSourceFilter} onValueChange={setLeadSourceFilter}>
              <SelectTrigger placeholder="All Sources" className="w-auto min-w-[120px] text-xs py-1.5" />
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {leadSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Row 2 — search + cost */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.dimText, pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Agent, Numbers Or Summaries…"
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                borderRadius: 8, fontSize: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: C.white, outline: "none",
              }}
            />
          </div>

          {accessRole !== "user" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              padding: "7px 14px", borderRadius: 8,
              background: "rgba(252,175,23,0.08)", border: "1px solid rgba(252,175,23,0.2)",
              fontSize: 12, fontWeight: 700, color: "#FCAF17",
            }}>
              <Coins size={13} />
              {fmtCost(totalCost)} Total
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => setExportOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 13px", borderRadius: 9, cursor: "pointer",
                background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.25)",
                color: "#307DC0", fontSize: 12, fontWeight: 700,
              }}
            >
              ↓ Export
            </button>
          )}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {["Date", "Agent", "Direction", "Lead Source", "Agent Phone", "Contact Phone", "Fields", "CRM", ...(accessRole !== "user" ? ["Cost"] : [])].map((h) => (
                <th key={h} style={{
                  padding: "12px 16px",
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "#e2e8f0", textAlign: "center",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: "56px 16px", textAlign: "center", color: C.dimText, fontSize: 13 }}>
                  No Call Logs Yet{period !== "all" ? " For This Period" : ""}.
                </td>
              </tr>
            )}
            {pageRows.map((c) => (
              <tr
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(48,125,192,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap", textAlign: "center" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", margin: 0 }}>{fmtDate(c.created_at)}</p>
                  <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0" }}>{fmtTime(c.created_at)}</p>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: c.agent_name ? C.text : C.dimText, whiteSpace: "nowrap", textAlign: "center" }}>
                  {c.agent_name ?? "—"}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <DirectionBadge dir={c.call_direction} />
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  {c.lead_source ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                      color: "#FCAF17", background: "rgba(252,175,23,0.1)",
                      border: "1px solid rgba(252,175,23,0.2)", whiteSpace: "nowrap",
                    }}>
                      {c.lead_source}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#334155" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: C.bodyText, fontFamily: "monospace", textAlign: "center" }}>
                  {c.agent_phone ?? "—"}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: C.bodyText, fontFamily: "monospace", textAlign: "center" }}>
                  {c.contact_phone ?? "—"}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>
                    {c.custom_fields?.length ?? 0}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
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
                {accessRole !== "user" && (
                  <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "#FCAF17", whiteSpace: "nowrap", textAlign: "center" }}>
                    {fmtCost(c.cost_usd)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>
            {filtered.length === 0 ? "0 logs" : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
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

      {/* Detail modal */}
      {selected && <DetailModal call={selected} onClose={() => setSelected(null)} accessRole={accessRole} />}
      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          data={calls as unknown as Record<string, unknown>[]}
          defaultCols={exportDefaultCols as unknown as ColDef<Record<string, unknown>>[]}
          extraCols={exportExtraCols as unknown as ColDef<Record<string, unknown>>[]}
          filenamePrefix="note-taker-calls"
          onServerExport={(cols, fromDate, toDate) => {
            const params = new URLSearchParams();
            if (fromDate) params.set("from", fromDate);
            if (toDate)   params.set("to",   toDate);
            if (direction        !== "all") params.set("direction",   direction);
            if (agentFilter      !== "all") params.set("agentFilter", agentFilter);
            if (leadSourceFilter !== "all") params.set("leadSource",  leadSourceFilter);
            if (companyId        !== "all") params.set("companyId",   companyId);
            params.set("cols", cols.join(","));
            const a = document.createElement("a");
            a.href = `/api/note-taker/export?${params.toString()}`;
            a.click();
          }}
        />
      )}
    </div>
  );
}
