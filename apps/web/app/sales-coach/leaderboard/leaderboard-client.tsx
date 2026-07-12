"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import DateRangePicker, { periodBounds, type DatePeriod } from "@/components/ui/date-range-picker";
import type { AccessRole } from "@/types/database";
import type { LeaderboardCall } from "./page";

/* ── Types ──────────────────────────────────────────────── */

interface AgentStats {
  userId:     string;
  name:       string;
  agentType:  string;
  companyId:  string;
  avgScore:   number;
  totalCalls: number;
  bands:      { elite: number; strong: number; workable: number; weak: number; coaching: number };
  rank:       number;
  rankChange: number | null;
}

interface Props {
  calls:         LeaderboardCall[];
  companies:     { id: string; name: string }[];
  accessRole:    AccessRole;
  currentUserId?: string;
}

/* ── Constants ──────────────────────────────────────────── */

const TYPES = [
  { value: "all", label: "All" },
  { value: "fus", label: "FUS" },
  { value: "acq", label: "ACQ" },
] as const;

const BAND_META = {
  elite:    { label: "Elite",          color: "#43B749", bg: "rgba(67,183,73,0.12)"   },
  strong:   { label: "Strong",         color: "#307DC0", bg: "rgba(48,125,192,0.12)"  },
  workable: { label: "Workable",       color: "#FCAF17", bg: "rgba(252,175,23,0.12)"  },
  weak:     { label: "Weak",           color: "#F36D71", bg: "rgba(243,109,113,0.12)" },
  coaching: { label: "Needs Coaching", color: "#ED1F24", bg: "rgba(237,31,36,0.12)"   },
} as const;

/* ── Helpers ────────────────────────────────────────────── */

function getBandKey(score: number): keyof typeof BAND_META {
  if (score >= 90) return "elite";
  if (score >= 75) return "strong";
  if (score >= 60) return "workable";
  if (score >= 45) return "weak";
  return "coaching";
}

function scoreColor(score: number) {
  if (score >= 80) return "#43B749";
  if (score >= 60) return "#307DC0";
  if (score >= 40) return "#FCAF17";
  return "#ED1F24";
}

function prevPeriodRange(period: DatePeriod): { start: Date; end: Date } | null {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const DAY   = 86_400_000;
  if (period === "today")     return { start: new Date(today.getTime() - DAY), end: today };
  if (period === "yesterday") return { start: new Date(today.getTime() - 2 * DAY), end: new Date(today.getTime() - DAY) };
  if (period === "7d")        return { start: new Date(today.getTime() - 14 * DAY), end: new Date(today.getTime() - 7 * DAY) };
  if (period === "30d")       return { start: new Date(today.getTime() - 60 * DAY), end: new Date(today.getTime() - 30 * DAY) };
  if (period === "month") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const curr = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: prev, end: curr };
  }
  return null;
}

function buildStats(calls: LeaderboardCall[], period: DatePeriod, customFrom: string, customTo: string): AgentStats[] {
  const { from: curFrom, to: curTo } = periodBounds(period, customFrom, customTo);
  const prevRange = prevPeriodRange(period);

  const cur = calls.filter(c => {
    const d = new Date(c.created_at);
    if (curFrom && d < curFrom) return false;
    if (curTo   && d > curTo)   return false;
    return true;
  });
  const prev = prevRange
    ? calls.filter(c => { const d = new Date(c.created_at); return d >= prevRange.start && d < prevRange.end; })
    : [];

  const map = new Map<string, { totalScore: number; count: number; agent: LeaderboardCall["agent"]; companyId: string; bands: AgentStats["bands"] }>();
  for (const c of cur) {
    if (!c.agent) continue;
    const bk = getBandKey(c.score);
    const ex = map.get(c.user_id);
    if (ex) { ex.totalScore += c.score; ex.count++; ex.bands[bk]++; }
    else map.set(c.user_id, { totalScore: c.score, count: 1, agent: c.agent, companyId: c.company_id, bands: { elite: 0, strong: 0, workable: 0, weak: 0, coaching: 0, [bk]: 1 } });
  }

  const sorted = Array.from(map.entries())
    .map(([userId, d]) => ({ userId, avg: d.totalScore / d.count, ...d }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);

  const prevMap = new Map<string, number>();
  if (prev.length > 0) {
    const pm = new Map<string, { total: number; count: number }>();
    for (const c of prev) {
      if (!c.agent) continue;
      const ex = pm.get(c.user_id);
      ex ? (ex.total += c.score, ex.count++) : pm.set(c.user_id, { total: c.score, count: 1 });
    }
    Array.from(pm.entries())
      .sort(([, a], [, b]) => (b.total / b.count) - (a.total / a.count))
      .forEach(([userId], i) => prevMap.set(userId, i + 1));
  }

  return sorted.map((d, i) => ({
    userId:     d.userId,
    name:       d.agent?.full_name ?? "Unknown",
    agentType:  d.agent?.agent_type ?? "none",
    companyId:  d.companyId,
    avgScore:   Math.round(d.avg * 10) / 10,
    totalCalls: d.count,
    bands:      d.bands,
    rank:       i + 1,
    rankChange: prevMap.has(d.userId) ? (prevMap.get(d.userId)! - (i + 1)) : null,
  }));
}

/* ── Count-up hook ──────────────────────────────────────── */

function useCountUp(target: number, duration = 800, delay = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (target === 0) { setCount(0); return; }
      const start = performance.now();
      function step(now: number) {
        const p = Math.min((now - start) / duration, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setCount(Math.round(e * target * 10) / 10);
        if (p < 1) requestAnimationFrame(step);
        else setCount(target);
      }
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, duration, delay]);
  return count;
}

/* ── Sub-components ─────────────────────────────────────── */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
      <Trophy size={14} style={{ color: "#fbbf24" }} />
    </div>
  );
  if (rank === 2) return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
      style={{ background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.25)", color: "#94a3b8" }}>2</div>
  );
  if (rank === 3) return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
      style={{ background: "rgba(180,120,60,0.12)", border: "1px solid rgba(180,120,60,0.25)", color: "#cd7c3a" }}>3</div>
  );
  return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-semibold"
      style={{ color: "#334155" }}>{rank}</div>
  );
}

function RankChange({ change }: { change: number | null }) {
  if (change === null) return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: "rgba(48,125,192,0.1)", color: "#78ABD6" }}>NEW</span>
  );
  if (change === 0) return <Minus size={13} style={{ color: "#334155" }} />;
  if (change > 0)  return <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: "#43B749" }}><TrendingUp size={12} /> {change}</span>;
  return <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: "#ED1F24" }}><TrendingDown size={12} /> {Math.abs(change)}</span>;
}

function BandPills({ bands }: { bands: AgentStats["bands"] }) {
  const order: (keyof typeof BAND_META)[] = ["elite", "strong", "workable", "weak", "coaching"];
  return (
    <div className="flex flex-wrap gap-1">
      {order.map((k) => bands[k] > 0 ? (
        <span key={k} className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ color: BAND_META[k].color, background: BAND_META[k].bg }}>
          {bands[k]} {BAND_META[k].label}
        </span>
      ) : null)}
    </div>
  );
}

function PodiumCard({ s, isMe, delay }: { s: AgentStats; isMe: boolean; delay: number }) {
  const color = scoreColor(s.avgScore);
  const score = useCountUp(s.avgScore, 900, delay + 200);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`glass rounded-2xl p-5 flex flex-col items-center text-center gap-2 ${s.rank === 1 ? "ring-1" : ""}`}
      style={s.rank === 1 ? { boxShadow: "0 0 24px rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)" } : {}}
    >
      <RankBadge rank={s.rank} />
      <div>
        <p className="text-sm font-bold text-white">{s.name}{isMe ? " (you)" : ""}</p>
        <div className="flex justify-center mt-1"><Badge variant={s.agentType as any} /></div>
      </div>
      <div className="text-3xl font-black mt-1" style={{ color }}>{score}</div>
      <p className="text-[10px] uppercase tracking-widest" style={{ color: "#334155" }}>avg score</p>
      <p className="text-xs" style={{ color: "#475569" }}>{s.totalCalls} call{s.totalCalls !== 1 ? "s" : ""}</p>
      <div className="mt-1"><RankChange change={s.rankChange} /></div>
    </motion.div>
  );
}

/* ── Main ───────────────────────────────────────────────── */

export default function LeaderboardClient({ calls, companies, accessRole, currentUserId }: Props) {
  const [period,     setPeriod]    = useState<DatePeriod>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [agentType,  setAgentType] = useState<"all" | "fus" | "acq">("all");
  const [companyId,  setCompanyId] = useState<string>("all");

  const leaderboard = useMemo(() => {
    let filtered = calls;
    if (agentType !== "all") filtered = filtered.filter(c => c.agent?.agent_type === agentType);
    if (companyId !== "all") filtered = filtered.filter(c => c.company_id === companyId);
    return buildStats(filtered, period, customFrom, customTo);
  }, [calls, period, customFrom, customTo, agentType, companyId]);

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <h1 className="text-xl font-bold gradient-text">Leaderboard</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            {leaderboard.length} agent{leaderboard.length !== 1 ? "s" : ""} ranked
          </p>
        </div>

        <div className="flex items-start gap-3 flex-shrink-0">
          {/* Company filter — super_admin */}
          {accessRole === "super_admin" && companies.length > 0 && (
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger placeholder="All Companies" className="w-auto min-w-[160px] text-xs py-2" />
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex rounded-xl overflow-hidden mt-0.5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {TYPES.map((t) => (
              <button key={t.value} onClick={() => setAgentType(t.value)}
                className="px-3 py-2 text-xs font-medium transition-colors"
                style={{ background: agentType === t.value ? "rgba(48,125,192,0.15)" : "transparent", color: agentType === t.value ? "#78ABD6" : "#475569" }}>
                {t.label}
              </button>
            ))}
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
      </motion.div>

      {/* Empty state */}
      {leaderboard.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass rounded-2xl flex flex-col items-center justify-center py-24"
          style={{ color: "#334155" }}
        >
          <Trophy size={36} className="mb-3 opacity-20" />
          <p className="text-sm">No scored calls found for this period.</p>
        </motion.div>
      )}

      {/* Podium — top 3 in [2nd, 1st, 3rd] visual order */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 0, 2].map((podiumIdx, vi) => {
            const s = leaderboard[podiumIdx];
            if (!s) return <div key={podiumIdx} />;
            return <PodiumCard key={s.userId} s={s} isMe={s.userId === currentUserId} delay={vi * 0.08} />;
          })}
        </div>
      )}

      {/* Full table */}
      {leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["Rank", "Agent", "Avg Score", "Calls", "Score Bands", "Change"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: "#334155" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {leaderboard.map((s, i) => {
                  const isMe  = s.userId === currentUserId;
                  const color = scoreColor(s.avgScore);
                  return (
                    <motion.tr
                      key={s.userId}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.28, delay: 0.35 + i * 0.04 }}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        background: isMe ? "rgba(48,125,192,0.05)" : "transparent",
                      }}
                    >
                      <td className="px-5 py-3.5"><RankBadge rank={s.rank} /></td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: "rgba(48,125,192,0.12)", color: "#78ABD6" }}>
                            {s.name[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {s.name}{isMe && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(48,125,192,0.15)", color: "#78ABD6" }}>you</span>}
                            </p>
                            <div className="mt-0.5"><Badge variant={s.agentType as any} /></div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${s.avgScore}%` }}
                              transition={{ duration: 0.8, delay: 0.4 + i * 0.04, ease: "easeOut" }}
                              style={{ background: color }}
                            />
                          </div>
                          <span className="text-sm font-bold" style={{ color }}>{s.avgScore}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-white">{s.totalCalls}</span>
                        <span className="text-xs ml-1" style={{ color: "#334155" }}>scored</span>
                      </td>

                      <td className="px-5 py-3.5"><BandPills bands={s.bands} /></td>
                      <td className="px-5 py-3.5"><RankChange change={s.rankChange} /></td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
