"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import type { AccessRole } from "@/types/database";
import type { AnalyticsCall } from "./page";

interface Props {
  calls:         AnalyticsCall[];
  companies:     { id: string; name: string }[];
  accessRole:    AccessRole;
  currentUserId?: string;
  currentUserAgentType?: string | null;
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

function meetsMinDuration(sec: number | null, minMinutes: typeof DURATIONS[number]["value"]): boolean {
  if (minMinutes === "all") return true;
  if (sec == null) return false;
  return sec >= Number(minMinutes) * 60;
}

function periodDays(period: DatePeriod): number {
  if (period === "today" || period === "yesterday") return 1;
  if (period === "7d")    return 7;
  if (period === "30d")   return 30;
  if (period === "month") return 30;
  if (period === "all")   return 60;
  return 30; // custom
}

const CHART_COLORS = {
  primary:   "#307DC0",
  blue:      "#78ABD6",
  green:     "#43B749",
  amber:     "#FCAF17",
  red:       "#ED1F24",
  cyan:      "#307DC0",
  muted:     "rgba(255,255,255,0.06)",
  text:      "#475569",
  textLight: "#334155",
};

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeAnalytics(calls: AnalyticsCall[], period: DatePeriod) {
  const scorable = calls.filter(c => c.scorable && c.score !== null);

  // ── Score trend (by day) ────────────────────────────────────────────────────
  const days = periodDays(period);
  const trendMap = new Map<string, { total: number; count: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    trendMap.set(d.toISOString().split("T")[0], { total: 0, count: 0 });
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

  // ── Call volume by day (inbound / outbound) ─────────────────────────────────
  const volMap = new Map<string, { inbound: number; outbound: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    volMap.set(d.toISOString().split("T")[0], { inbound: 0, outbound: 0 });
  }
  for (const c of calls) {
    const key = c.created_at.split("T")[0];
    const ex  = volMap.get(key);
    if (ex) ex[c.direction]++;
  }
  const callVolume = Array.from(volMap.entries()).map(([date, v]) => ({
    date: dayLabel(date), ...v, total: v.inbound + v.outbound,
  }));

  // ── Score by agent type ─────────────────────────────────────────────────────
  const typeMap = new Map<string, { total: number; count: number }>();
  for (const c of scorable) {
    const t  = c.agent?.agent_type ?? "unknown";
    const ex = typeMap.get(t);
    ex ? (ex.total += c.score!, ex.count++) : typeMap.set(t, { total: c.score!, count: 1 });
  }
  const scoreByType = Array.from(typeMap.entries())
    .filter(([t]) => t !== "none" && t !== "tc" && t !== "cc")
    .map(([type, { total, count }]) => ({
      type: type.toUpperCase(),
      avgScore: Math.round((total / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // ── Call results ────────────────────────────────────────────────────────────
  const resultMap = new Map<string, number>();
  for (const c of calls) {
    const r = c.call_result ?? "Unknown";
    resultMap.set(r, (resultMap.get(r) ?? 0) + 1);
  }
  const callResults = Array.from(resultMap.entries())
    .map(([result, count]) => ({ result, count }))
    .sort((a, b) => b.count - a.count);

  // ── Opportunity level ───────────────────────────────────────────────────────
  const oppMap: Record<string, number> = { low: 0, medium: 0, high: 0 };
  for (const c of calls) {
    const lvl = c.evaluation?.opportunity_level;
    if (lvl) oppMap[lvl]++;
  }
  const opportunityLevels = [
    { level: "High",   count: oppMap.high,   color: CHART_COLORS.green  },
    { level: "Medium", count: oppMap.medium, color: CHART_COLORS.amber  },
    { level: "Low",    count: oppMap.low,    color: CHART_COLORS.red    },
  ];

  // ── Score distribution (bands) ──────────────────────────────────────────────
  const bands = [
    { band: "0–44",   min: 0,  max: 44,  color: CHART_COLORS.red    },
    { band: "45–59",  min: 45, max: 59,  color: CHART_COLORS.amber  },
    { band: "60–74",  min: 60, max: 74,  color: CHART_COLORS.primary },
    { band: "75–89",  min: 75, max: 89,  color: CHART_COLORS.blue   },
    { band: "90–100", min: 90, max: 100, color: CHART_COLORS.green  },
  ];
  const scoreDistribution = bands.map(b => ({
    band:  b.band,
    count: scorable.filter(c => c.score! >= b.min && c.score! <= b.max).length,
    color: b.color,
  }));

  // ── Summary stats ───────────────────────────────────────────────────────────
  const totalCalls     = calls.length;
  const avgScore       = scorable.length > 0 ? Math.round(scorable.reduce((s, c) => s + c.score!, 0) / scorable.length) : null;
  const scorableRate   = totalCalls > 0 ? Math.round((scorable.length / totalCalls) * 100) : 0;
  const managerReviews = calls.filter(c => c.evaluation?.manager_review_needed).length;
  const inboundCount   = calls.filter(c => c.direction === "inbound").length;
  const outboundCount  = calls.filter(c => c.direction === "outbound").length;

  return {
    scoreTrend, callVolume, scoreByType, callResults,
    opportunityLevels, scoreDistribution,
    totalCalls, avgScore, scorableRate, managerReviews,
    inboundCount, outboundCount,
  };
}

// ── Shared tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs space-y-1"
      style={{ background: "rgba(15,32,50,0.97)", border: "1px solid rgba(48,125,192,0.15)", backdropFilter: "blur(12px)" }}>
      {label && <p className="font-semibold text-white mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2" style={{ color: p.color ?? "#94a3b8" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: p.color }} />
          <span style={{ color: "#94a3b8" }}>{p.name}:</span>
          <span className="font-semibold text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass rounded-2xl px-5 py-4">
      <p className="text-xs font-medium mb-1" style={{ color: "#475569" }}>{label}</p>
      <p className="text-2xl font-black text-white">{value ?? "—"}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "#334155" }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-white">{title}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

const RESULT_COLORS = ["#307DC0", "#78ABD6", "#43B749", "#FCAF17", "#ED1F24", "#27679D", "#78ABD6"];

export default function AnalyticsClient({ calls, companies, accessRole, currentUserId, currentUserAgentType }: Props) {
  const [period,      setPeriod]      = useState<DatePeriod>("today");
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");
  const [companyId,   setCompanyId]   = useState<string>("all");
  const [view,        setView]        = useState<"my" | "company">("company");
  const [direction,   setDirection]   = useState<typeof DIRECTIONS[number]["value"]>("all");
  const [duration,    setDuration]    = useState<typeof DURATIONS[number]["value"]>("2");
  const [role,        setRole]        = useState<string>(currentUserAgentType ?? "all");
  const [scorable,    setScorable]    = useState<typeof SCORABLE_OPTS[number]["value"]>("scorable");
  const [leadSource,  setLeadSource]  = useState<string>("all");
  const [agentIds,    setAgentIds]    = useState<string[]>(
    accessRole === "user" && currentUserId ? [currentUserId] : []
  );

  const agents = useMemo(() => {
    const map = new Map<string, string>();
    calls.forEach((c) => { if (c.user_id && c.agent?.full_name) map.set(c.user_id, c.agent.full_name); });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [calls]);

  const leadSources = useMemo(() => {
    const set = new Set<string>();
    calls.forEach((c) => { const ls = c.evaluation?.meta?.lead_source; if (ls) set.add(ls); });
    return Array.from(set).sort();
  }, [calls]);

  const filtered = useMemo(() => {
    let c = calls;
    if (companyId !== "all") c = c.filter(x => x.company_id === companyId);
    if (accessRole === "user" && view === "my") c = c.filter(x => x.user_id === currentUserId);
    if (direction !== "all") c = c.filter(x => x.direction === direction);
    if (duration !== "all") c = c.filter(x => meetsMinDuration(x.duration_sec, duration));
    if (role !== "all") c = c.filter(x => (x.agent?.agent_type ?? "none") === role);
    if (scorable === "scorable") c = c.filter(x => x.scorable);
    if (leadSource !== "all") c = c.filter(x => x.evaluation?.meta?.lead_source === leadSource);
    if (agentIds.length > 0) c = c.filter(x => agentIds.includes(x.user_id));
    const { from: pFrom, to: pTo } = periodBounds(period, customFrom, customTo);
    if (pFrom) c = c.filter(x => new Date(x.created_at) >= pFrom);
    if (pTo)   c = c.filter(x => new Date(x.created_at) <= pTo);
    return c;
  }, [calls, companyId, view, accessRole, currentUserId, direction, duration, role, scorable, leadSource, agentIds, period, customFrom, customTo]);

  const data = useMemo(() => computeAnalytics(filtered, period), [filtered, period]);

  const showCompanyToggle = accessRole === "user";
  const axisStyle = { fontSize: 11, fill: CHART_COLORS.text };

  return (
    <div className="px-8 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold gradient-text">Analytics</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            {data.totalCalls} calls in view
          </p>
        </div>

        <div className="flex items-start gap-3">
          {/* My / Company toggle — user only */}
          {showCompanyToggle && (
            <div className="flex rounded-xl overflow-hidden mt-0.5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["my", "company"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className="px-3 py-2 text-xs font-medium transition-colors capitalize"
                  style={{
                    background: view === v ? "rgba(67,183,73,0.15)" : "transparent",
                    color:      view === v ? "#43B749" : "#475569",
                  }}>
                  {v === "my" ? "My Calls" : "Company"}
                </button>
              ))}
            </div>
          )}

          {/* Company filter — super_admin */}
          {accessRole === "super_admin" && companies.length > 0 && (
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger placeholder="All Companies" className="w-auto min-w-[160px] text-xs py-2" />
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date range picker */}
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

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
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

        <Select value={role} onValueChange={(v) => setRole(v)}>
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

        {leadSources.length > 0 && (
          <Select value={leadSource} onValueChange={setLeadSource}>
            <SelectTrigger placeholder="Lead Source" className="w-auto min-w-[100px] text-xs py-1.5" />
            <SelectContent>
              <SelectItem value="all">All Lead Sources</SelectItem>
              {leadSources.map((ls) => <SelectItem key={ls} value={ls}>{ls}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {agents.length > 1 && (
          <MultiSelect
            options={agents}
            selected={agentIds}
            onChange={setAgentIds}
            placeholder="Agents"
            className="min-w-[90px] py-1.5"
          />
        )}
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <StatCard label="Total Calls"     value={data.totalCalls} />
        <StatCard label="Avg Score"       value={data.avgScore ?? "—"} sub="/100" />
        <StatCard label="Scorable Rate"   value={`${data.scorableRate}%`} />
        <StatCard label="Manager Reviews" value={data.managerReviews} sub="flagged" />
        <StatCard label="Inbound"         value={data.inboundCount} />
        <StatCard label="Outbound"        value={data.outboundCount} />
      </div>

      {/* Score trend */}
      <ChartCard title="Score Trend" sub="Average score per day for scored calls">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.scoreTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} />
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
            <Area type="monotone" dataKey="avgScore" name="Avg Score" stroke={CHART_COLORS.primary}
              strokeWidth={2} fill="url(#scoreGrad)" dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.primary, strokeWidth: 0 }}
              connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Call volume */}
      <ChartCard title="Call Volume" sub="Inbound vs outbound calls per day">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.callVolume} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Legend wrapperStyle={{ fontSize: 11, color: CHART_COLORS.text, paddingTop: 12 }} />
            <Bar dataKey="inbound"  name="Inbound"  fill={CHART_COLORS.green} radius={[3,3,0,0]} stackId="a" />
            <Bar dataKey="outbound" name="Outbound" fill={CHART_COLORS.blue}  radius={[3,3,0,0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Bottom row: 3 charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Score distribution */}
        <ChartCard title="Score Distribution" sub="Calls by score band">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.scoreDistribution} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
              <XAxis dataKey="band" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" name="Calls" radius={[4,4,0,0]}>
                {data.scoreDistribution.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Score by agent type */}
        <ChartCard title="Score by Agent Type" sub="Avg score — FUS vs ACQ">
          {data.scoreByType.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#334155" }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.scoreByType} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
                <XAxis dataKey="type" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="avgScore" name="Avg Score" radius={[4,4,0,0]}>
                  {data.scoreByType.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? CHART_COLORS.primary : CHART_COLORS.blue} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Opportunity level */}
        <ChartCard title="Opportunity Level" sub="Distribution across scored calls">
          {data.opportunityLevels.every(o => o.count === 0) ? (
            <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#334155" }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.opportunityLevels} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
                <XAxis dataKey="level" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" name="Calls" radius={[4,4,0,0]}>
                  {data.opportunityLevels.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Call results */}
      <ChartCard title="Call Results" sub="Outcome breakdown for all calls">
        {data.callResults.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: "#334155" }}>No data</div>
        ) : (
          <div className="space-y-2.5">
            {data.callResults.map((r, i) => {
              const max = data.callResults[0].count;
              const pct = Math.round((r.count / max) * 100);
              const color = RESULT_COLORS[i % RESULT_COLORS.length];
              return (
                <div key={r.result} className="flex items-center gap-3">
                  <span className="text-sm w-44 truncate flex-shrink-0" style={{ color: "#94a3b8" }}>{r.result}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: CHART_COLORS.muted }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right flex-shrink-0" style={{ color }}>{r.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

    </div>
  );
}
