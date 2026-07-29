"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import type { AnalyticsCall } from "@/app/sales-coach/analytics/page";
import type { AccessRole } from "@/types/database";

interface Filters {
  period: string; from: string; to: string; direction: string; duration: string;
  role: string; scorable: string; leadSource: string; agentIds: string[]; companyId: string; view: string;
}

interface Props {
  calls:         AnalyticsCall[];
  accessRole:    AccessRole;
  currentUserId: string;
  filters:       Filters;
}

function meetsMinDuration(sec: number | null, min: string) {
  if (min === "all") return true;
  if (sec == null)   return false;
  return sec >= Number(min) * 60;
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeAnalytics(calls: AnalyticsCall[], pFrom: Date | null, pTo: Date) {
  const scorable = calls.filter(c => c.scorable && c.score !== null);

  const now = new Date();
  const bucketStart = pFrom ?? new Date(
    calls.length > 0
      ? Math.min(...calls.map(c => new Date(c.created_at).getTime()))
      : now.getTime() - 60 * 86400000
  );
  bucketStart.setHours(0, 0, 0, 0);

  const trendMap = new Map<string, { total: number; count: number }>();
  const volMap   = new Map<string, { inbound: number; outbound: number }>();
  const cur = new Date(bucketStart);
  while (cur <= pTo) {
    const key = cur.toISOString().split("T")[0];
    trendMap.set(key, { total: 0, count: 0 });
    volMap.set(key,   { inbound: 0, outbound: 0 });
    cur.setDate(cur.getDate() + 1);
  }

  for (const c of scorable) {
    const key = c.created_at.split("T")[0];
    const ex  = trendMap.get(key);
    if (ex) { ex.total += c.score!; ex.count++; }
  }
  const scoreTrend = Array.from(trendMap.entries()).map(([date, { total, count }]) => ({
    date: dayLabel(date),
    avgScore: count > 0 ? Math.round((total / count) * 10) / 10 : null,
    calls: count,
  }));

  for (const c of calls) {
    const key = c.created_at.split("T")[0];
    const ex  = volMap.get(key);
    if (ex) ex[c.direction as "inbound" | "outbound"]++;
  }
  const callVolume = Array.from(volMap.entries()).map(([date, v]) => ({
    date: dayLabel(date), ...v, total: v.inbound + v.outbound,
  }));

  const typeMap = new Map<string, { total: number; count: number }>();
  for (const c of scorable) {
    const t  = c.agent?.agent_type ?? "unknown";
    const ex = typeMap.get(t);
    ex ? (ex.total += c.score!, ex.count++) : typeMap.set(t, { total: c.score!, count: 1 });
  }
  const scoreByType = Array.from(typeMap.entries())
    .filter(([t]) => t !== "none" && t !== "tc" && t !== "cc")
    .map(([type, { total, count }]) => ({ type: type.toUpperCase(), avgScore: Math.round((total / count) * 10) / 10, count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const oppMap: Record<string, number> = { low: 0, medium: 0, high: 0 };
  for (const c of calls) { const lvl = c.evaluation?.opportunity_level; if (lvl) oppMap[lvl]++; }
  const opportunityLevels = [
    { level: "High",   count: oppMap.high,   color: "#43B749" },
    { level: "Medium", count: oppMap.medium, color: "#FCAF17" },
    { level: "Low",    count: oppMap.low,    color: "#ED1F24" },
  ];

  const bands = [
    { band: "0–44",   min: 0,  max: 44,  color: "#ED1F24" },
    { band: "45–59",  min: 45, max: 59,  color: "#FCAF17" },
    { band: "60–74",  min: 60, max: 74,  color: "#307DC0" },
    { band: "75–89",  min: 75, max: 89,  color: "#78ABD6" },
    { band: "90–100", min: 90, max: 100, color: "#43B749" },
  ];
  const scoreDistribution = bands.map(b => ({
    band: b.band, count: scorable.filter(c => c.score! >= b.min && c.score! <= b.max).length, color: b.color,
  }));

  const lsMap = new Map<string, { count: number; scoreTotal: number; scoreCount: number }>();
  for (const c of calls) {
    const ls = c.evaluation?.meta?.lead_source;
    if (!ls) continue;
    const ex = lsMap.get(ls);
    if (ex) {
      ex.count++;
      if (c.score !== null) { ex.scoreTotal += c.score; ex.scoreCount++; }
    } else {
      lsMap.set(ls, { count: 1, scoreTotal: c.score ?? 0, scoreCount: c.score !== null ? 1 : 0 });
    }
  }
  const leadSourceStats = Array.from(lsMap.entries())
    .map(([source, { count, scoreTotal, scoreCount }]) => ({
      source, count,
      avgScore: scoreCount > 0 ? Math.round((scoreTotal / scoreCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count);

  const totalCalls     = calls.length;
  const avgScore       = scorable.length > 0 ? Math.round(scorable.reduce((s, c) => s + c.score!, 0) / scorable.length) : null;
  const scorableRate   = totalCalls > 0 ? Math.round((scorable.length / totalCalls) * 100) : 0;
  const managerReviews = calls.filter(c => c.evaluation?.manager_review_needed).length;
  const inboundCount   = calls.filter(c => c.direction === "inbound").length;
  const outboundCount  = calls.filter(c => c.direction === "outbound").length;

  return { scoreTrend, callVolume, scoreByType, opportunityLevels, scoreDistribution, leadSourceStats, totalCalls, avgScore, scorableRate, managerReviews, inboundCount, outboundCount };
}

const T = { fill: "#475569", muted: "#475569", grid: "rgba(255,255,255,0.06)" };
const RESULT_COLORS = ["#307DC0", "#78ABD6", "#43B749", "#FCAF17", "#ED1F24", "#27679D"];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(13,28,42,0.97)", border: "1px solid rgba(48,125,192,0.25)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      {label && <p style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, margin: 0 }}>
          <span style={{ color: T.muted }}>{p.name}: </span>
          <strong style={{ color: "#f1f5f9" }}>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "14px 18px", background: `${color}10` }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 900, color, margin: 0 }}>{value ?? "—"}</p>
      {sub && <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function Card({ title, sub, color = "#307DC0", children }: { title: string; sub?: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, background: "rgba(255,255,255,0.03)" }}>
      <div style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 3, minHeight: 32, borderRadius: 99, background: color, flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{title}</p>
          {sub && <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

async function downloadAsPDF(contentRef: HTMLElement, filename: string, onStart: () => void, onDone: () => void) {
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

    const blocks = Array.from(contentRef.querySelectorAll<HTMLElement>(":scope > .pdf-block"));

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

export default function SCAnalyticsPrintClient({ calls, accessRole, currentUserId, filters }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    document.body.style.background = "#0D1C2A";
    return () => { document.body.style.background = ""; };
  }, []);

  const { from: pFrom, to: pTo } = periodBounds(filters.period as DatePeriod, filters.from, filters.to);

  const filtered = useMemo(() => {
    let c = calls;
    if (filters.companyId !== "all") c = c.filter(x => x.company_id === filters.companyId);
    if (filters.direction  !== "all") c = c.filter(x => x.direction === filters.direction);
    if (filters.duration   !== "all") c = c.filter(x => meetsMinDuration(x.duration_sec, filters.duration));
    if (filters.role       !== "all") c = c.filter(x => (x.agent?.agent_type ?? "none") === filters.role);
    if (filters.scorable   === "scorable") c = c.filter(x => x.scorable);
    if (filters.leadSource !== "all") c = c.filter(x => x.evaluation?.meta?.lead_source === filters.leadSource);
    if (filters.agentIds.length > 0) c = c.filter(x => filters.agentIds.includes(x.user_id));
    if (accessRole === "user" && filters.view === "my") c = c.filter(x => x.user_id === currentUserId);
    if (pFrom) c = c.filter(x => new Date(x.created_at) >= pFrom);
    if (pTo)   c = c.filter(x => new Date(x.created_at) <= pTo);
    return c;
  }, [calls, filters, pFrom, pTo]);

  const data = useMemo(() => computeAnalytics(filtered, pFrom, pTo ?? new Date()), [filtered, pFrom, pTo]);

  const dateLabel = filters.period === "custom"
    ? [pFrom && pFrom.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), pTo && pTo.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })].filter(Boolean).join(" – ")
    : (PERIOD_LABELS[filters.period] ?? "All Time");

  const maxLsCount = data.leadSourceStats[0]?.count ?? 1;

  return (
    <div style={{ background: "#0D1C2A", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 1.2cm; size: landscape; }
          body { background: #0D1C2A !important; }
        }
      `}</style>

      {/* Sticky download bar */}
      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(15,32,50,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        padding: "10px 48px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12,
      }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          Sales Coach Analytics — {dateLabel} · {data.totalCalls} calls
        </span>
        <button
          onClick={() => contentRef.current && downloadAsPDF(contentRef.current, `sc-analytics-${filters.period}.pdf`, () => setDownloading(true), () => setDownloading(false))}
          disabled={downloading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 8,
            background: downloading ? "rgba(48,125,192,0.4)" : "#307DC0", border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600, cursor: downloading ? "default" : "pointer",
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
            <div style={{ fontSize: 11, fontWeight: 700, color: "#307DC0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Sales Coach</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9", margin: 0, lineHeight: 1.1 }}>Analytics Report</h1>
            <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{dateLabel} · {data.totalCalls} calls</p>
          </div>
          <span style={{ fontSize: 12, color: T.muted, paddingTop: 8 }}>
            Exported {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {/* Stat Cards */}
        <div className="pdf-block" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Calls"     value={data.totalCalls}         color="#307DC0" />
          <StatCard label="Avg Score"       value={data.avgScore ?? "—"}    color="#43B749" sub="/100" />
          <StatCard label="Scorable Rate"   value={`${data.scorableRate}%`} color="#FCAF17" />
          <StatCard label="Manager Reviews" value={data.managerReviews}     color="#ED1F24" sub="Flagged" />
          <StatCard label="Inbound"         value={data.inboundCount}       color="#43B749" />
          <StatCard label="Outbound"        value={data.outboundCount}      color="#307DC0" />
        </div>

        {/* Score Trend */}
        <div className="pdf-block" style={{ marginBottom: 20 }}>
          <Card title="Score Trend" sub="Average Score Per Day" color="#43B749">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.scoreTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="scoreGradP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#43B749" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#43B749" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.grid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.fill }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: T.fill }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
                <Area type="monotone" dataKey="avgScore" name="Avg Score" stroke="#43B749" strokeWidth={2} fill="url(#scoreGradP)" dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Call Volume */}
        <div className="pdf-block" style={{ marginBottom: 20 }}>
          <Card title="Call Volume" sub="Inbound vs Outbound Per Day" color="#307DC0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.callVolume} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.fill }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: T.fill }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: T.muted, paddingTop: 8 }} />
                <Bar dataKey="inbound"  name="Inbound"  fill="#43B749" radius={[3,3,0,0]} stackId="a" />
                <Bar dataKey="outbound" name="Outbound" fill="#307DC0" radius={[3,3,0,0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Bottom row — 3 charts */}
        <div className="pdf-block" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Card title="Score Distribution" sub="Calls by Score Band" color="#FCAF17">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.scoreDistribution} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
                <XAxis dataKey="band" tick={{ fontSize: 9, fill: T.fill }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: T.fill }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" name="Calls" radius={[4,4,0,0]}>
                  {data.scoreDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Score by Agent Type" sub="Avg Score — FUS vs ACQ" color="#307DC0">
            {data.scoreByType.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: T.muted, fontSize: 13 }}>No Data</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.scoreByType} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
                  <XAxis dataKey="type" tick={{ fontSize: 10, fill: T.fill }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: T.fill }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="avgScore" name="Avg Score" radius={[4,4,0,0]}>
                    {data.scoreByType.map((_, i) => <Cell key={i} fill={i === 0 ? "#307DC0" : "#78ABD6"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Opportunity Level" sub="Distribution Across Scored Calls" color="#43B749">
            {data.opportunityLevels.every(o => o.count === 0) ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: T.muted, fontSize: 13 }}>No Data</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.opportunityLevels} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
                  <XAxis dataKey="level" tick={{ fontSize: 10, fill: T.fill }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: T.fill }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="count" name="Calls" radius={[4,4,0,0]}>
                    {data.opportunityLevels.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Lead Source Breakdown */}
        {data.leadSourceStats.length > 0 && (
          <div className="pdf-block">
            <Card title="Lead Source Breakdown" sub="Call Volume and Avg Score Per Lead Source" color="#FCAF17">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 48px" }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Call Volume</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.leadSourceStats.map((r, i) => {
                      const pct   = Math.round((r.count / maxLsCount) * 100);
                      const color = RESULT_COLORS[i % RESULT_COLORS.length];
                      return (
                        <div key={r.source} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, width: 112, flexShrink: 0, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.source}</span>
                          <div style={{ flex: 1, height: 8, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, width: 24, textAlign: "right", flexShrink: 0, color }}>{r.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Avg Score</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.leadSourceStats.map((r) => {
                      const score = r.avgScore;
                      const pct   = score != null ? Math.round((score / 100) * 100) : 0;
                      const color = score == null ? "#334155"
                        : score >= 80 ? "#43B749"
                        : score >= 60 ? "#307DC0"
                        : score >= 45 ? "#FCAF17"
                        : "#ED1F24";
                      return (
                        <div key={r.source} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, width: 112, flexShrink: 0, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.source}</span>
                          <div style={{ flex: 1, height: 8, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, width: 32, textAlign: "right", flexShrink: 0, color }}>
                            {score != null ? score : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
