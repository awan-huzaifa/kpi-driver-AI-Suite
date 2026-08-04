"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { Download } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import type { AccessRole } from "@/types/database";
import type { TrainingAnalyticsCall } from "./page";

interface Props {
  calls:         TrainingAnalyticsCall[];
  companies:     { id: string; name: string }[];
  accessRole:    AccessRole;
  currentUserId?: string;
}

const DURATIONS = [
  { value: "all", label: "Any Duration" },
  { value: "1",   label: "1+ Min"  },
  { value: "2",   label: "2+ Min"  },
  { value: "5",   label: "5+ Min"  },
  { value: "10",  label: "10+ Min" },
  { value: "15",  label: "15+ Min" },
] as const;

const SCORABLE_OPTS = [
  { value: "scorable", label: "Scorable Only" },
  { value: "all",      label: "All Sessions"  },
] as const;

const CHART_COLORS = {
  primary:   "#307DC0",
  blue:      "#78ABD6",
  green:     "#43B749",
  amber:     "#FCAF17",
  red:       "#ED1F24",
  muted:     "rgba(255,255,255,0.06)",
  text:      "#475569",
};

const BAR_PALETTE = ["#307DC0", "#43B749", "#FCAF17", "#78ABD6", "#ED1F24", "#27679D"];

function meetsMinDuration(sec: number | null, min: typeof DURATIONS[number]["value"]): boolean {
  if (min === "all") return true;
  if (sec == null) return false;
  return sec >= Number(min) * 60;
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeAnalytics(calls: TrainingAnalyticsCall[], period: DatePeriod, customFrom = "", customTo = "") {
  const scorable = calls.filter(c => c.scorable && c.score !== null);

  const { from: pFrom, to: pTo } = periodBounds(period, customFrom, customTo);
  const now = new Date();
  const bucketEnd   = pTo ?? now;
  let   bucketStart: Date;
  if (pFrom) {
    bucketStart = new Date(pFrom);
  } else {
    const minTs = calls.length > 0
      ? Math.min(...calls.map(c => new Date(c.created_at).getTime()))
      : now.getTime() - 60 * 86400000;
    bucketStart = new Date(minTs);
  }
  bucketStart.setHours(0, 0, 0, 0);

  const trendMap = new Map<string, { total: number; count: number }>();
  const volMap   = new Map<string, { inbound: number; outbound: number }>();
  const cur = new Date(bucketStart);
  while (cur <= bucketEnd) {
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
    sessions: count,
  }));

  for (const c of calls) {
    const key = c.created_at.split("T")[0];
    const ex  = volMap.get(key);
    if (ex) {
      const dir = (c.direction ?? "outbound") as "inbound" | "outbound";
      ex[dir]++;
    }
  }
  const sessionVolume = Array.from(volMap.entries()).map(([date, v]) => ({
    date: dayLabel(date), ...v, total: v.inbound + v.outbound,
  }));

  // Score by AI Agent
  const agentMap = new Map<string, { total: number; count: number }>();
  for (const c of scorable) {
    const name = c.ai_agent?.agent_name ?? "Unknown";
    const ex   = agentMap.get(name);
    ex ? (ex.total += c.score!, ex.count++) : agentMap.set(name, { total: c.score!, count: 1 });
  }
  const scoreByAgent = Array.from(agentMap.entries())
    .map(([agent, { total, count }]) => ({
      agent,
      avgScore: Math.round((total / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8);

  // Score by Rep Role
  const roleMap = new Map<string, { total: number; count: number }>();
  for (const c of scorable) {
    const t  = c.agent?.agent_type ?? "none";
    const ex = roleMap.get(t);
    ex ? (ex.total += c.score!, ex.count++) : roleMap.set(t, { total: c.score!, count: 1 });
  }
  const scoreByRole = Array.from(roleMap.entries())
    .filter(([t]) => t !== "none")
    .map(([role, { total, count }]) => ({
      role: role.toUpperCase(),
      avgScore: Math.round((total / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Score distribution
  const bands = [
    { band: "0–44",   min: 0,  max: 44,  color: CHART_COLORS.red     },
    { band: "45–59",  min: 45, max: 59,  color: CHART_COLORS.amber   },
    { band: "60–74",  min: 60, max: 74,  color: CHART_COLORS.primary },
    { band: "75–89",  min: 75, max: 89,  color: CHART_COLORS.blue    },
    { band: "90–100", min: 90, max: 100, color: CHART_COLORS.green   },
  ];
  const scoreDistribution = bands.map(b => ({
    band:  b.band,
    count: scorable.filter(c => c.score! >= b.min && c.score! <= b.max).length,
    color: b.color,
  }));

  // Top performers
  const repMap = new Map<string, { name: string; total: number; count: number }>();
  for (const c of scorable) {
    const id   = c.user_id;
    const name = c.agent?.full_name ?? "Unknown";
    const ex   = repMap.get(id);
    ex ? (ex.total += c.score!, ex.count++) : repMap.set(id, { name, total: c.score!, count: 1 });
  }
  const topPerformers = Array.from(repMap.values())
    .map(({ name, total, count }) => ({ name, avgScore: Math.round((total / count) * 10) / 10, sessions: count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8);

  // Summary
  const totalSessions = calls.length;
  const avgScore      = scorable.length > 0 ? Math.round(scorable.reduce((s, c) => s + c.score!, 0) / scorable.length) : null;
  const scorableRate  = totalSessions > 0 ? Math.round((scorable.length / totalSessions) * 100) : 0;
  const uniqueReps    = new Set(calls.map(c => c.user_id)).size;
  const inboundCount  = calls.filter(c => c.direction === "inbound").length;
  const outboundCount = calls.filter(c => c.direction === "outbound").length;

  return {
    scoreTrend, sessionVolume, scoreDistribution,
    scoreByAgent, scoreByRole, topPerformers,
    totalSessions, avgScore, scorableRate, uniqueReps, inboundCount, outboundCount,
  };
}

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

function StatCard({ label, value, sub, color = "#307DC0" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderTop:    `2px solid ${color}30`,
        borderLeft:   `3px solid ${color}`,
        borderRight:  "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background:   hovered ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
        borderRadius: 16, padding: "16px 20px",
        transform:    hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow:    hovered ? `0 8px 24px ${color}20` : "none",
        transition:   "all 0.2s ease", cursor: "default",
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, color, margin: 0 }}>{value ?? "—"}</p>
      {sub && <p style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, sub, children, color = "#307DC0" }: { title: string; sub?: string; children: React.ReactNode; color?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   hovered ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.03)",
        border:       `1px solid ${hovered ? `${color}30` : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16, padding: 20,
        transform:    hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow:    hovered ? `0 8px 32px ${color}15` : "none",
        transition:   "all 0.2s ease",
      }}
    >
      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 3, minHeight: 34, borderRadius: 99, background: color, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>{title}</p>
          {sub && <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function TrainingAnalyticsClient({ calls, companies, accessRole, currentUserId }: Props) {
  const [period,     setPeriod]     = useState<DatePeriod>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [companyId,  setCompanyId]  = useState<string>("all");
  const [duration,   setDuration]   = useState<typeof DURATIONS[number]["value"]>("2");
  const [scorable,   setScorable]   = useState<typeof SCORABLE_OPTS[number]["value"]>("all");
  const [agentIds,   setAgentIds]   = useState<string[]>([]);
  const [aiAgents,   setAiAgents]   = useState<string[]>([]);

  const repOptions = useMemo(() => {
    const map = new Map<string, string>();
    calls.forEach(c => { if (c.user_id && c.agent?.full_name) map.set(c.user_id, c.agent.full_name); });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [calls]);

  const aiAgentOptions = useMemo(() => {
    const set = new Set<string>();
    calls.forEach(c => { if (c.ai_agent?.agent_name) set.add(c.ai_agent.agent_name); });
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [calls]);

  const filtered = useMemo(() => {
    let c = calls;
    if (companyId !== "all") c = c.filter(x => x.company_id === companyId);
    if (duration  !== "all") c = c.filter(x => meetsMinDuration(x.duration_sec, duration));
    if (scorable === "scorable") c = c.filter(x => x.scorable);
    if (agentIds.length > 0)  c = c.filter(x => agentIds.includes(x.user_id));
    if (aiAgents.length > 0)  c = c.filter(x => aiAgents.includes(x.ai_agent?.agent_name ?? ""));
    const { from: pFrom, to: pTo } = periodBounds(period, customFrom, customTo);
    if (pFrom) c = c.filter(x => new Date(x.created_at) >= pFrom);
    if (pTo)   c = c.filter(x => new Date(x.created_at) <= pTo);
    return c;
  }, [calls, companyId, duration, scorable, agentIds, aiAgents, period, customFrom, customTo]);

  const data = useMemo(() => computeAnalytics(filtered, period, customFrom, customTo), [filtered, period, customFrom, customTo]);

  const axisStyle = { fontSize: 11, fill: CHART_COLORS.text };

  return (
    <div className="px-8 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold gradient-text">Analytics</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            {data.totalSessions} Sessions In View
          </p>
        </div>

        <div className="flex items-start gap-3">
          {accessRole === "super_admin" && companies.length > 0 && (
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger placeholder="All Companies" className="w-auto min-w-[160px] text-xs py-2" />
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
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

          {(accessRole === "admin" || accessRole === "super_admin") && (
            <button
              onClick={() => {
                const p = new URLSearchParams();
                p.set("period", period);
                if (customFrom)          p.set("from",      customFrom);
                if (customTo)            p.set("to",        customTo);
                if (duration  !== "all") p.set("duration",  duration);
                if (scorable  !== "all") p.set("scorable",  scorable);
                if (agentIds.length > 0) p.set("agentIds",  agentIds.join(","));
                if (aiAgents.length > 0) p.set("aiAgent",   aiAgents.join(","));
                if (companyId !== "all") p.set("companyId", companyId);
                window.open(`/tc-analytics?${p.toString()}`, "_blank");
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9,
                background: "rgba(48,125,192,0.08)", border: "1px solid rgba(48,125,192,0.2)",
                color: "#307DC0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              <Download size={13} />
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={duration} onValueChange={v => setDuration(v as typeof duration)}>
          <SelectTrigger placeholder="Duration" className="w-auto min-w-[90px] text-xs py-1.5" />
          <SelectContent>
            {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={scorable} onValueChange={v => setScorable(v as typeof scorable)}>
          <SelectTrigger placeholder="Scorable" className="w-auto min-w-[110px] text-xs py-1.5" />
          <SelectContent>
            {SCORABLE_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {repOptions.length > 1 && (
          <MultiSelect
            options={repOptions}
            selected={agentIds}
            onChange={setAgentIds}
            placeholder="Reps"
            className="min-w-[90px] py-1.5"
          />
        )}

        {aiAgentOptions.length > 1 && (
          <MultiSelect
            options={aiAgentOptions}
            selected={aiAgents}
            onChange={setAiAgents}
            placeholder="AI Agent"
            className="min-w-[100px] py-1.5"
          />
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <StatCard label="Total Sessions"  value={data.totalSessions}           color="#307DC0" />
        <StatCard label="Avg Score"       value={data.avgScore ?? "—"} sub="/100" color="#43B749" />
        <StatCard label="Scorable Rate"   value={`${data.scorableRate}%`}       color="#FCAF17" />
        <StatCard label="Unique Reps"     value={data.uniqueReps}               color="#307DC0" />
        <StatCard label="Inbound"         value={data.inboundCount}             color="#43B749" />
        <StatCard label="Outbound"        value={data.outboundCount}            color="#78ABD6" />
      </div>

      {/* Score Trend */}
      <ChartCard title="Score Trend" sub="Average Score Per Day For Scored Sessions" color="#43B749">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.scoreTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="tcScoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} />
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
            <Area type="monotone" dataKey="avgScore" name="Avg Score" stroke={CHART_COLORS.green}
              strokeWidth={2} fill="url(#tcScoreGrad)" dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.green, strokeWidth: 0 }}
              connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Session Volume */}
      <ChartCard title="Session Volume" sub="Training Sessions Per Day" color="#307DC0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.sessionVolume} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={14}>
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

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Score Distribution */}
        <ChartCard title="Score Distribution" sub="Sessions By Score Band" color="#FCAF17">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.scoreDistribution} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
              <XAxis dataKey="band" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" name="Sessions" radius={[4,4,0,0]}>
                {data.scoreDistribution.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Score by AI Agent */}
        <ChartCard title="Score By AI Agent" sub="Avg Score Per Training Persona" color="#307DC0">
          {data.scoreByAgent.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#334155" }}>No Data</div>
          ) : (
            <div className="space-y-2.5" style={{ paddingTop: 4 }}>
              {data.scoreByAgent.map((r, i) => {
                const color = r.avgScore >= 80 ? CHART_COLORS.green
                  : r.avgScore >= 60 ? CHART_COLORS.primary
                  : r.avgScore >= 45 ? CHART_COLORS.amber
                  : CHART_COLORS.red;
                return (
                  <div key={r.agent} className="flex items-center gap-3">
                    <span className="text-xs flex-shrink-0 truncate" style={{ color: "#94a3b8", width: 120 }}>{r.agent}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: CHART_COLORS.muted }}>
                      <div className="h-full rounded-full" style={{ width: `${r.avgScore}%`, background: color }} />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right flex-shrink-0" style={{ color }}>{r.avgScore}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: "#334155" }}>({r.count})</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Score by Role */}
        <ChartCard title="Score By Role" sub="Avg Score Per Agent Type" color="#43B749">
          {data.scoreByRole.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm" style={{ color: "#334155" }}>No Data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.scoreByRole} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
                <XAxis dataKey="role" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="avgScore" name="Avg Score" radius={[4,4,0,0]}>
                  {data.scoreByRole.map((_, i) => (
                    <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top Performers */}
      {data.topPerformers.length > 0 && (
        <ChartCard title="Top Performers" sub="Reps Ranked By Average Training Score" color="#43B749">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {data.topPerformers.map((rep, i) => {
              const color = rep.avgScore >= 80 ? CHART_COLORS.green
                : rep.avgScore >= 60 ? CHART_COLORS.primary
                : rep.avgScore >= 45 ? CHART_COLORS.amber
                : CHART_COLORS.red;
              return (
                <div key={rep.name} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                    background: i === 0 ? "rgba(252,175,23,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${i === 0 ? "rgba(252,175,23,0.3)" : "rgba(255,255,255,0.08)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800,
                    color: i === 0 ? "#FCAF17" : "#475569",
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rep.name}
                  </span>
                  <span style={{ fontSize: 12, color: "#475569" }}>{rep.sessions} sessions</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color, flexShrink: 0 }}>{rep.avgScore}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

    </div>
  );
}
