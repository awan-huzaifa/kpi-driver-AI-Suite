"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Database, X, Search, ExternalLink, Copy, Check, ChevronRight, Calendar, Hash, Layers } from "lucide-react";
import { C } from "@/components/platform/brand";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import type { AccessRole } from "@/types/database";

interface EnrichmentField {
  key:   string;
  value: unknown;
}

interface EnrichmentLog {
  id:           string;
  company_id:   string;
  external_id:  string | null;
  contact_name: string | null;
  fields:       EnrichmentField[];
  cost_usd:     number;
  created_at:   string;
}

interface Props {
  logs:       EnrichmentLog[];
  companies:  { id: string; name: string }[];
  accessRole: AccessRole;
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("default", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });
}

function fmtCost(n: number) {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(4)}`;
}

function fmtKey(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function isUrl(v: unknown): boolean {
  try { return typeof v === "string" && new URL(v).protocol.startsWith("http"); }
  catch { return false; }
}

function isNumeric(v: unknown): boolean {
  return typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "");
}

function previewLabel(fields: EnrichmentField[]): string {
  const preferred = ["address", "property_address", "street_address", "zillow_zpid", "parcel_id", "name"];
  for (const key of preferred) {
    const f = fields.find((f) => f.key === key);
    if (f) return fmtValue(f.value);
  }
  return "Enrichment Record";
}

function previewKeys(fields: EnrichmentField[]): string[] {
  return fields.slice(0, 4).map((f) => fmtKey(f.key));
}

/* ── Copy button ──────────────────────────────────────────────────── */
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

/* ── Detail Modal ─────────────────────────────────────────────────── */
function DetailModal({ log, onClose }: { log: EnrichmentLog; onClose: () => void }) {
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
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "80px 24px 24px",
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{   opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 760, maxHeight: "88vh", overflowY: "auto",
            background: "#0a1829",
            border: "1px solid rgba(48,125,192,0.2)",
            borderRadius: 24,
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Modal header */}
          <div style={{
            padding: "24px 28px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(180deg, rgba(48,125,192,0.08) 0%, transparent 100%)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg, rgba(48,125,192,0.25) 0%, rgba(67,183,73,0.15) 100%)",
                  border: "1px solid rgba(48,125,192,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Database size={20} style={{ color: C.blue }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: C.white, margin: 0, letterSpacing: "-0.01em" }}>
                    {log.contact_name ?? previewLabel(log.fields)}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                    {log.external_id && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.dimText }}>
                        <Hash size={10} />
                        {log.external_id}
                      </span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.dimText }}>
                      <Calendar size={10} />
                      {fmtDate(log.created_at)} · {fmtTime(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer", color: C.dimText, display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = C.white; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = C.dimText; }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Stats strip */}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(48,125,192,0.08)", border: "1px solid rgba(48,125,192,0.15)",
                borderRadius: 10, padding: "8px 14px",
              }}>
                <Layers size={13} style={{ color: C.blue }} />
                <div>
                  <p style={{ fontSize: 10, color: C.dimText, margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Fields</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.blue, margin: 0 }}>{log.fields.length}</p>
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(67,183,73,0.06)", border: "1px solid rgba(67,183,73,0.15)",
                borderRadius: 10, padding: "8px 14px",
              }}>
                <Check size={13} style={{ color: C.green }} />
                <div>
                  <p style={{ fontSize: 10, color: C.dimText, margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.green, margin: 0 }}>Enriched</p>
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(252,175,23,0.06)", border: "1px solid rgba(252,175,23,0.15)",
                borderRadius: 10, padding: "8px 14px",
              }}>
                <div>
                  <p style={{ fontSize: 10, color: C.dimText, margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cost</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#FCAF17", margin: 0 }}>{fmtCost(log.cost_usd)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Fields list */}
          <div style={{ padding: "20px 28px 28px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
              Enriched Fields
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {log.fields.map((f, i) => (
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
                  {/* Key */}
                  <div style={{ width: "36%", flexShrink: 0, paddingRight: 16 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: C.blue,
                      background: "rgba(48,125,192,0.08)", borderRadius: 5,
                      padding: "2px 8px", display: "inline-block",
                    }}>
                      {fmtKey(f.key)}
                    </span>
                  </div>
                  {/* Value */}
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
                    {isUrl(f.value) ? (
                      <a
                        href={String(f.value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: C.blue, display: "inline-flex", alignItems: "center", gap: 5,
                          textDecoration: "none", fontSize: 12, fontWeight: 500,
                          background: "rgba(48,125,192,0.08)", border: "1px solid rgba(48,125,192,0.2)",
                          borderRadius: 6, padding: "3px 10px",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(48,125,192,0.16)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(48,125,192,0.08)"; }}
                      >
                        Open link <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span style={{
                        fontSize: 12, lineHeight: 1.6, wordBreak: "break-word",
                        color: isNumeric(f.value) ? C.white : C.bodyText,
                        fontWeight: isNumeric(f.value) ? 700 : 400,
                        whiteSpace: "pre-wrap", flex: 1,
                      }}>
                        {fmtValue(f.value)}
                      </span>
                    )}
                    {!isUrl(f.value) && fmtValue(f.value) !== "—" && (
                      <CopyButton value={fmtValue(f.value)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

export default function DataEnrichmentClient({ logs, companies, accessRole }: Props) {
  const searchParams = useSearchParams();
  const [period,     setPeriod]     = useState<DatePeriod>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [companyId, setCompanyId] = useState<string>("all");
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<EnrichmentLog | null>(null);

  useEffect(() => {
    const logId = searchParams.get("logId");
    if (logId) {
      const match = logs.find(l => l.id === logId);
      if (match) setSelected(match);
    }
  }, []);

  const filtered = useMemo(() => {
    const { from: start, to: end } = periodBounds(period, customFrom, customTo);
    return logs.filter((l) => {
      if (companyId !== "all" && l.company_id !== companyId) return false;
      if (start && new Date(l.created_at) < start) return false;
      if (end   && new Date(l.created_at) > end)   return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = l.contact_name?.toLowerCase().includes(q);
        const idMatch   = l.external_id?.toLowerCase().includes(q);
        const fieldMatch = l.fields.some(
          (f) => f.key.toLowerCase().includes(q) || fmtValue(f.value).toLowerCase().includes(q)
        );
        if (!nameMatch && !idMatch && !fieldMatch) return false;
      }
      return true;
    });
  }, [logs, companyId, period, customFrom, customTo, search]);

  const totalFields = useMemo(() => filtered.reduce((s, l) => s + l.fields.length, 0), [filtered]);
  const totalCost   = useMemo(() => filtered.reduce((s, l) => s + (l.cost_usd ?? 0), 0), [filtered]);

  return (
    <div style={{ padding: "32px 36px" }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 28 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, rgba(48,125,192,0.2) 0%, rgba(67,183,73,0.12) 100%)",
            border: "1px solid rgba(48,125,192,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Database size={13} style={{ color: C.blue }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.blue, margin: 0, letterSpacing: "0.09em", textTransform: "uppercase" }}>
            AI Data Enrichment
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: C.white, letterSpacing: "-0.02em", margin: 0 }}>
              Enrichment Logs
            </h1>
            <p style={{ fontSize: 13, color: C.bodyText, marginTop: 4 }}>
              All enrichment records — click any row to view the full details.
            </p>
          </div>
          {/* Stats */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{
              background: "rgba(48,125,192,0.07)", border: "1px solid rgba(48,125,192,0.15)",
              borderRadius: 12, padding: "10px 16px", textAlign: "right",
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>Records</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: C.white, margin: 0 }}>{filtered.length}</p>
            </div>
            <div style={{
              background: "rgba(67,183,73,0.06)", border: "1px solid rgba(67,183,73,0.15)",
              borderRadius: 12, padding: "10px 16px", textAlign: "right",
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>Fields Enriched</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: C.green, margin: 0 }}>{totalFields}</p>
            </div>
            <div style={{
              background: "rgba(252,175,23,0.06)", border: "1px solid rgba(252,175,23,0.15)",
              borderRadius: 12, padding: "10px 16px", textAlign: "right",
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>Total Cost</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: "#FCAF17", margin: 0 }}>{fmtCost(totalCost)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        {accessRole === "super_admin" && companies.length > 0 && (
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger placeholder="All Companies" className="w-auto min-w-[140px] text-xs py-1.5" />
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
          activeColor={C.blue}
        />

        <div style={{ position: "relative", marginLeft: "auto" }}>
          <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.dimText, pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts, IDs, fields…"
            style={{
              paddingLeft: 32, paddingRight: search ? 32 : 14, paddingTop: 8, paddingBottom: 8,
              borderRadius: 10, fontSize: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: C.white, outline: "none", width: 240,
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(48,125,192,0.4)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: C.dimText, padding: 2,
              }}
            >
              <X size={12} />
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
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
              {["Date & Time", "Contact / Record", "Field Preview", "Fields", "Cost"].map((h, i) => (
                <th key={h} style={{
                  padding: "11px 16px", textAlign: i >= 3 ? "center" : "left",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
                  textTransform: "uppercase", color: "#475569",
                }}>{h}</th>
              ))}
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "64px 16px", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: "rgba(48,125,192,0.08)", border: "1px solid rgba(48,125,192,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Database size={20} style={{ color: C.dimText }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.dimText, margin: 0 }}>
                      No enrichment logs{period !== "all" ? " for this period" : ""}.
                    </p>
                    <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>
                      Records will appear here once data is enriched.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((l, idx) => {
              const keys = previewKeys(l.fields);
              return (
                <tr
                  key={l.id}
                  onClick={() => setSelected(l)}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    cursor: "pointer", transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(48,125,192,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Date */}
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.bodyText, margin: 0 }}>
                      {fmtDate(l.created_at)}
                    </p>
                    <p style={{ fontSize: 11, color: C.dimText, margin: "2px 0 0" }}>
                      {fmtTime(l.created_at)}
                    </p>
                  </td>

                  {/* Contact */}
                  <td style={{ padding: "13px 16px", maxWidth: 220 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.white, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.contact_name ?? previewLabel(l.fields)}
                    </p>
                    {l.external_id && (
                      <p style={{ fontSize: 11, color: C.dimText, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3 }}>
                        <Hash size={9} />
                        {l.external_id}
                      </p>
                    )}
                  </td>

                  {/* Field preview tags */}
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {keys.map((k) => (
                        <span key={k} style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                          color: C.mutedText, whiteSpace: "nowrap",
                        }}>
                          {k}
                        </span>
                      ))}
                      {l.fields.length > 4 && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                          background: "rgba(48,125,192,0.08)", border: "1px solid rgba(48,125,192,0.15)",
                          color: C.blue, whiteSpace: "nowrap",
                        }}>
                          +{l.fields.length - 4}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Fields count */}
                  <td style={{ padding: "13px 16px", textAlign: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>
                      {l.fields.length}
                    </span>
                  </td>

                  {/* Cost */}
                  <td style={{ padding: "13px 16px", textAlign: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#FCAF17" }}>
                      {fmtCost(l.cost_usd ?? 0)}
                    </span>
                  </td>

                  {/* Arrow */}
                  <td style={{ padding: "13px 12px 13px 0", width: 32 }}>
                    <ChevronRight size={14} style={{ color: C.dimText, display: "block" }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div style={{
            padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.04)",
            fontSize: 11, color: C.dimText, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Database size={11} />
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} · {totalFields} fields enriched · {fmtCost(totalCost)} total cost
          </div>
        )}
      </motion.div>

      {selected && <DetailModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
