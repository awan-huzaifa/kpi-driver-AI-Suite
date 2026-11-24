"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, ChevronRight, Calendar, Mail, Users, User, Loader2 } from "lucide-react";
import { C } from "@/components/platform/brand";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import type { AccessRole } from "@/types/database";

interface SentReport {
  id:                 string;
  company_id:         string;
  recipient_user_id:  string | null;
  recipient_email:    string;
  app:                string;
  variant:            string;
  subject:            string;
  period_label:       string;
  period_from:        string;
  period_to:          string;
  sent_at:            string;
}

interface Props {
  reports:    SentReport[];
  companies:  { id: string; name: string }[];
  accessRole: AccessRole;
}

const VARIANT_LABELS: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  team:     { label: "Team",     color: C.blue,    bg: "rgba(48,125,192,0.1)",  border: "rgba(48,125,192,0.25)",  icon: Users   },
  rep:      { label: "Rep",      color: C.green,   bg: "rgba(67,183,73,0.1)",   border: "rgba(67,183,73,0.25)",   icon: User    },
  rep_copy: { label: "Rep Copy", color: "#FCAF17", bg: "rgba(252,175,23,0.1)",  border: "rgba(252,175,23,0.25)",  icon: Mail    },
};

const PERIOD_TYPES = [
  { value: "all",     label: "All Types"  },
  { value: "daily",   label: "Daily"      },
  { value: "weekly",  label: "Weekly"     },
  { value: "monthly", label: "Monthly"    },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function VariantBadge({ variant }: { variant: string }) {
  const cfg = VARIANT_LABELS[variant] ?? { label: variant, color: C.dimText, bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", icon: FileText };
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700,
      padding: "3px 8px", borderRadius: 99,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

/* ── Report Modal ──────────────────────────────────────────────────── */
function ReportModal({ report, onClose }: { report: SentReport; onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${report.id}`)
      .then(r => r.json())
      .then(d => setHtml(d.html_content ?? ""))
      .catch(() => setHtml(""))
      .finally(() => setLoading(false));
  }, [report.id]);

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
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "40px 24px 24px",
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{   opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 860, height: "calc(100vh - 80px)",
            display: "flex", flexDirection: "column",
            background: "#0a1829",
            border: "1px solid rgba(48,125,192,0.2)",
            borderRadius: 20,
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
            background: "linear-gradient(180deg, rgba(48,125,192,0.06) 0%, transparent 100%)",
          }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.white, margin: "0 0 4px" }}>{report.subject}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <VariantBadge variant={report.variant} />
                <span style={{ fontSize: 11, color: C.dimText }}>{report.period_label}</span>
                <span style={{ fontSize: 11, color: C.dimText }}>→ {report.recipient_email}</span>
                <span style={{ fontSize: 11, color: C.dimText }}>{fmtDate(report.sent_at)} {fmtTime(report.sent_at)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer", color: C.dimText, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <Loader2 size={24} style={{ color: C.blue, animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <iframe
                srcDoc={html ?? ""}
                style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
                sandbox="allow-same-origin"
                title="Report Preview"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function ReportsClient({ reports, companies, accessRole }: Props) {
  const [period,      setPeriod]      = useState<DatePeriod>("month");
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");
  const [companyId,   setCompanyId]   = useState("all");
  const [variant,     setVariant]     = useState("all");
  const [periodType,  setPeriodType]  = useState("all");
  const [selected,    setSelected]    = useState<SentReport | null>(null);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const { from: start, to: end } = periodBounds(period, customFrom, customTo);
    return reports.filter(r => {
      if (companyId !== "all" && r.company_id !== companyId) return false;
      if (variant   !== "all" && r.variant    !== variant)    return false;
      if (start && new Date(r.sent_at) < start) return false;
      if (end   && new Date(r.sent_at) > end)   return false;
      if (periodType !== "all") {
        const lbl = r.period_label.toLowerCase();
        if (periodType === "daily"   && !lbl.includes("daily")   && !lbl.includes("today") && !lbl.includes("yesterday")) return false;
        if (periodType === "weekly"  && !lbl.includes("week"))  return false;
        if (periodType === "monthly" && !lbl.includes("month"))  return false;
      }
      return true;
    });
  }, [reports, companyId, variant, period, customFrom, customTo, periodType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div style={{ padding: "32px 36px" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, rgba(48,125,192,0.2) 0%, rgba(67,183,73,0.12) 100%)",
            border: "1px solid rgba(48,125,192,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileText size={13} style={{ color: C.blue }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.blue, margin: 0, letterSpacing: "0.09em", textTransform: "uppercase" }}>
            Sales Coach
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: C.white, letterSpacing: "-0.02em", margin: 0 }}>Reports</h1>
            <p style={{ fontSize: 13, color: C.bodyText, marginTop: 4 }}>Sent email reports. Click any row to preview.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Total",   value: String(filtered.length),                                    color: C.white },
              { label: "Team",    value: String(filtered.filter(r => r.variant === "team").length),   color: C.blue  },
              { label: "Rep",     value: String(filtered.filter(r => r.variant === "rep").length),    color: C.green },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "10px 16px", textAlign: "center", minWidth: 68,
              }}>
                <p style={{ fontSize: 20, fontWeight: 900, color, margin: "0 0 2px" }}>{value}</p>
                <p style={{ fontSize: 10, color: C.dimText, margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>

        <DateRangePicker
          period={period} customFrom={customFrom} customTo={customTo}
          onPeriod={setPeriod} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
          activeColor={C.blue}
        />

        <Select value={periodType} onValueChange={setPeriodType}>
          <SelectTrigger placeholder="All Types" className="w-auto min-w-[120px] text-xs py-1.5" />
          <SelectContent>
            {PERIOD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={variant} onValueChange={setVariant}>
          <SelectTrigger placeholder="All Variants" className="w-auto min-w-[130px] text-xs py-1.5" />
          <SelectContent>
            <SelectItem value="all">All Variants</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="rep">Rep</SelectItem>
            <SelectItem value="rep_copy">Rep Copy</SelectItem>
          </SelectContent>
        </Select>

        {accessRole === "super_admin" && companies.length > 0 && (
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger placeholder="All Companies" className="w-auto min-w-[150px] text-xs py-1.5" />
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
        className="glass rounded-2xl overflow-hidden">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
              {["Sent At", "Subject", "Period", "Variant", "Recipient"].map(h => (
                <th key={h} style={{
                  padding: "11px 16px", textAlign: "left",
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "#e2e8f0",
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
                      <FileText size={20} style={{ color: C.dimText }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.dimText, margin: 0 }}>No reports found.</p>
                    <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>Reports will appear here once they are sent.</p>
                  </div>
                </td>
              </tr>
            )}
            {pageRows.map(r => (
              <tr
                key={r.id}
                onClick={() => setSelected(r)}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(48,125,192,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.bodyText, margin: 0 }}>{fmtDate(r.sent_at)}</p>
                  <p style={{ fontSize: 11, color: C.dimText, margin: "2px 0 0" }}>{fmtTime(r.sent_at)}</p>
                </td>
                <td style={{ padding: "13px 16px", maxWidth: 280 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.white, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.subject}
                  </p>
                </td>
                <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 12, color: C.bodyText }}>{r.period_label}</span>
                </td>
                <td style={{ padding: "13px 16px" }}>
                  <VariantBadge variant={r.variant} />
                </td>
                <td style={{ padding: "13px 16px", maxWidth: 220 }}>
                  <p style={{ fontSize: 12, color: C.dimText, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.recipient_email}
                  </p>
                </td>
                <td style={{ padding: "13px 12px 13px 0", width: 32 }}>
                  <ChevronRight size={14} style={{ color: C.dimText }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>
            {filtered.length === 0 ? "0 reports" : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{
              padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12, fontWeight: 600, background: "transparent", cursor: safePage === 1 ? "default" : "pointer",
              color: safePage === 1 ? "#334155" : "#94a3b8", opacity: safePage === 1 ? 0.4 : 1,
            }}>← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{
              padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12, fontWeight: 600, background: "transparent", cursor: safePage === totalPages ? "default" : "pointer",
              color: safePage === totalPages ? "#334155" : "#94a3b8", opacity: safePage === totalPages ? 0.4 : 1,
            }}>Next →</button>
          </div>
        </div>
      </motion.div>

      {selected && <ReportModal report={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
