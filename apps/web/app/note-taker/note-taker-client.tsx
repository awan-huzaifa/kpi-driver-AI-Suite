"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  NotebookPen, PhoneIncoming, PhoneOutgoing, Phone,
  X, ChevronDown, Search, Coins,
} from "lucide-react";
import { C } from "@/components/platform/brand";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
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
  ai_summary:      string | null;
  normal_summary:  string | null;
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
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.dimText, padding: 4 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.dimText)}
            >
              <X size={18} />
            </button>
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
            <div>
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
          Call Logs
        </h1>
        <p style={{ fontSize: 13, color: C.bodyText, marginTop: 6 }}>
          All Call Notes — Click Any Row To View The Full Transcript.
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
              placeholder="Search agent, numbers or summaries…"
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
              {fmtCost(totalCost)} total
            </div>
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
              {["Date", "Agent", "Direction", "Lead Source", "Agent Phone", "Contact Phone", "AI Summary", "Tokens", ...(accessRole !== "user" ? ["Cost"] : [])].map((h) => (
                <th key={h} style={{
                  padding: "12px 16px", textAlign: "left",
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "#e2e8f0", textAlign: "center",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "56px 16px", textAlign: "center", color: C.dimText, fontSize: 13 }}>
                  No Call Logs Yet{period !== "all" ? " For This Period" : ""}.
                </td>
              </tr>
            )}
            {filtered.map((c) => (
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
                <td style={{ padding: "12px 16px", fontSize: 12, color: C.mutedText, whiteSpace: "nowrap", textAlign: "center" }}>
                  {fmt(c.created_at)}
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
                <td style={{ padding: "12px 16px", maxWidth: 320, textAlign: "center" }}>
                  <p style={{
                    fontSize: 12, color: C.bodyText, margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {c.ai_summary ?? c.normal_summary ?? "—"}
                  </p>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: C.dimText, whiteSpace: "nowrap", textAlign: "center" }}>
                  {(c.input_tokens + c.output_tokens).toLocaleString()}
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

        {filtered.length > 0 && (
          <div style={{
            padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
            fontSize: 11, color: C.dimText, fontWeight: 600,
          }}>
            {filtered.length} log{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </motion.div>

      {/* Detail modal */}
      {selected && <DetailModal call={selected} onClose={() => setSelected(null)} accessRole={accessRole} />}
    </div>
  );
}
