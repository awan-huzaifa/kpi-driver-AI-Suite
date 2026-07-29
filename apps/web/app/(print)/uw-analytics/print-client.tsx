"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import type { UWReport } from "@/app/underwriting/analytics/analytics-client";

interface Filters {
  period: string; from: string; to: string; companyId: string; userId: string; city: string;
}

interface Props {
  reports:       (UWReport & { company_id?: string | null })[];
  companies:     { id: string; name: string }[];
  accessRole:    string;
  currentUserId: string;
  filters:       Filters;
}

function fmt(n: number | null) {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function avg(arr: number[]) {
  if (!arr.length) return null;
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}

const CONDITION_ORDER = ["excellent", "good", "fair", "poor"] as const;
const CONDITION_META: Record<string, { color: string; label: string }> = {
  excellent: { color: "#43B749", label: "Excellent" },
  good:      { color: "#307DC0", label: "Good"      },
  fair:      { color: "#FCAF17", label: "Fair"      },
  poor:      { color: "#ED1F24", label: "Poor"      },
};

const T = { muted: "#475569" };

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "14px 18px", background: `${color}10` }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function SectionTitle({ title, sub, color = "#307DC0" }: { title: string; sub?: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 3, minHeight: 32, borderRadius: 99, background: color, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{title}</p>
        {sub && <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

async function downloadAsPDF(el: HTMLElement, filename: string, onStart: () => void, onDone: () => void) {
  onStart();
  try {
    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF }       = await import("jspdf");

    const pdf     = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW   = pdf.internal.pageSize.getWidth();
    const pageH   = pdf.internal.pageSize.getHeight();
    const margin  = 24;
    const usableW = pageW - margin * 2;

    const fillBg = () => {
      pdf.setFillColor(13, 28, 42);
      pdf.rect(0, 0, pageW, pageH, "F");
    };
    fillBg();

    const blocks = Array.from(el.querySelectorAll<HTMLElement>(":scope > .pdf-block"));

    let y = margin;
    for (const block of blocks) {
      const canvas  = await html2canvas(block, { scale: 2, useCORS: true, backgroundColor: "#0D1C2A" });
      const imgData = canvas.toDataURL("image/png");
      const ratio   = usableW / canvas.width;
      const imgH    = canvas.height * ratio;

      if (y + imgH > pageH - margin) {
        pdf.addPage();
        fillBg();
        y = margin;
      }

      pdf.addImage(imgData, "PNG", margin, y, usableW, imgH);
      y += imgH + 10;
    }

    pdf.save(filename);
  } finally {
    onDone();
  }
}

const PERIOD_LABELS: Record<string, string> = {
  today: "Today", yesterday: "Yesterday", "7d": "Last 7 Days",
  "30d": "Last 30 Days", month: "This Month", all: "All Time",
};

export default function UWAnalyticsPrintClient({ reports: allReports, companies, accessRole, currentUserId, filters }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    document.body.style.background = "#0D1C2A";
    return () => { document.body.style.background = ""; };
  }, []);

  const { from: pFrom, to: pTo } = periodBounds(filters.period as DatePeriod, filters.from, filters.to);

  const reports = useMemo(() => {
    return allReports.filter((r) => {
      if (filters.companyId !== "all" && r.company_id !== filters.companyId) return false;
      if (filters.userId    !== "all" && r.user_id    !== filters.userId)    return false;
      const d = new Date(r.created_at);
      if (pFrom && d < pFrom) return false;
      if (pTo   && d > pTo)   return false;
      if (filters.city !== "all") {
        const reportCity = ((r.property_data as Record<string, unknown> | null)?.city as string | undefined)?.trim() ?? "";
        if (reportCity !== filters.city) return false;
      }
      return true;
    });
  }, [allReports, filters, pFrom, pTo]);

  const arvMids      = reports.map(r => ((r.arv_low ?? 0) + (r.arv_high ?? 0)) / 2);
  const maxOfferMids = reports.map(r => ((r.max_offer_low ?? 0) + (r.max_offer_high ?? 0)) / 2);
  const repairMids   = reports.map(r => ((r.repair_cost_low ?? 0) + (r.repair_cost_high ?? 0)) / 2);
  const profits      = reports.map(r => r.investor_profit ?? 0).filter(n => n > 0);

  const avgARV    = avg(arvMids);
  const avgOffer  = avg(maxOfferMids);
  const avgRepair = avg(repairMids);
  const avgProfit = avg(profits);

  const cityMap = new Map<string, { count: number; arvSum: number }>();
  reports.forEach((r, i) => {
    const c   = ((r.property_data as Record<string, unknown> | null)?.city as string | undefined)?.trim() || "Unknown";
    const arv = arvMids[i];
    if (!cityMap.has(c)) cityMap.set(c, { count: 0, arvSum: 0 });
    cityMap.get(c)!.count++;
    cityMap.get(c)!.arvSum += arv;
  });
  const cityStats     = Array.from(cityMap.entries()).map(([c, { count, arvSum }]) => ({ city: c, count, avgARV: arvSum / count })).sort((a, b) => b.count - a.count).slice(0, 8);
  const maxCityCount  = cityStats[0]?.count ?? 1;

  const conditionStats = CONDITION_ORDER.map(grade => {
    const subset  = reports.filter(r => r.condition === grade);
    const repairs = subset.map(r => ((r.repair_cost_low ?? 0) + (r.repair_cost_high ?? 0)) / 2);
    return { grade, count: subset.length, avgRepair: avg(repairs) };
  });
  const maxConditionCount = Math.max(...conditionStats.map(c => c.count), 1);

  const dateLabel = filters.period === "custom"
    ? [pFrom && pFrom.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), pTo && pTo.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })].filter(Boolean).join(" – ")
    : (PERIOD_LABELS[filters.period] ?? "All Time");

  return (
    <div style={{ background: "#0D1C2A", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @media print { .no-print { display: none !important; } @page { margin: 1.2cm; size: landscape; } body { background: #0D1C2A !important; } }
      `}</style>

      {/* Sticky download bar */}
      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(15,32,50,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        padding: "10px 48px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12,
      }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          Deal Underwriting Analytics — {dateLabel} · {reports.length} deal{reports.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => contentRef.current && downloadAsPDF(contentRef.current, `uw-analytics-${filters.period}.pdf`, () => setDownloading(true), () => setDownloading(false))}
          disabled={downloading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 8,
            background: downloading ? "rgba(252,175,23,0.4)" : "#FCAF17", border: "none",
            color: "#0D1C2A", fontSize: 12, fontWeight: 700, cursor: downloading ? "default" : "pointer",
          }}
        >
          {downloading ? "Generating PDF…" : "⬇ Download PDF"}
        </button>
      </div>

      {/* Capturable content */}
      <div ref={contentRef} style={{ padding: "40px 48px" }}>

        {/* Header */}
        <div className="pdf-block" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, paddingBottom: 20, borderBottom: "2px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#FCAF17", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Deal Underwriting</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9", margin: 0, lineHeight: 1.1 }}>Analytics Report</h1>
            <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{dateLabel} · {reports.length} deal{reports.length !== 1 ? "s" : ""}</p>
          </div>
          <span style={{ fontSize: 12, color: T.muted, paddingTop: 8 }}>
            Exported {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {/* Financial Overview */}
        <div className="pdf-block" style={{ marginBottom: 28 }}>
          <SectionTitle title="Financial Overview" sub="Averages Across Filtered Deals" color="#43B749" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <StatCard label="Avg ARV"             value={fmt(avgARV)}    sub="After-Repair Value" color="#43B749" />
            <StatCard label="Avg Max Offer"       value={fmt(avgOffer)}  sub="Low–High Midpoint"  color="#307DC0" />
            <StatCard label="Avg Repair Cost"     value={fmt(avgRepair)} sub="Low–High Midpoint"  color="#FCAF17" />
            <StatCard label="Avg Investor Profit" value={fmt(avgProfit)} sub="Target Minimum"     color="#43B749" />
          </div>
        </div>

        {/* Market Insights */}
        <div className="pdf-block" style={{ marginBottom: 28 }}>
          <SectionTitle title="Market Insights" sub="Deal Volume and ARV by City · Repair Cost by Condition" color="#307DC0" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Cities */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Most Analyzed Cities</p>
              </div>
              {cityStats.length === 0 ? (
                <p style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 13 }}>No city data</p>
              ) : (
                cityStats.map(({ city, count, avgARV: cityARV }, i) => (
                  <div key={city} style={{ padding: "12px 20px", borderBottom: i < cityStats.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{city}</span>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#307DC0", margin: 0 }}>{fmt(cityARV)}</p>
                        <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>{count} deal{count !== 1 ? "s" : ""} · Avg ARV</p>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / maxCityCount) * 100}%`, background: "linear-gradient(90deg, #307DC0, #78ABD6)", borderRadius: 99 }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Condition Breakdown */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Condition Breakdown</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                    {["Condition", "Deals", "Avg Repair", "Share"].map((h, i) => (
                      <th key={h} style={{ padding: "8px 16px", textAlign: i === 0 ? "left" : "right", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conditionStats.map(({ grade, count, avgRepair: r }, i) => {
                    const m   = CONDITION_META[grade];
                    const pct = (count / maxConditionCount) * 100;
                    return (
                      <tr key={grade} style={{ borderBottom: i < conditionStats.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined, opacity: count === 0 ? 0.4 : 1 }}>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ display: "inline-flex", padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}30` }}>{m.label}</span>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{count}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{fmt(r)}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: m.color, borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: 11, color: T.muted, width: 32, textAlign: "right" }}>{count > 0 ? `${Math.round(pct)}%` : "—"}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
