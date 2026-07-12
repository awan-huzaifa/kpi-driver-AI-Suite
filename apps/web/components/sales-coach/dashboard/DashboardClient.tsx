"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Zap } from "lucide-react";
import DashboardStats from "./DashboardStats";
import CallsChart from "./CallsChart";
import ScoreDistribution from "./ScoreDistribution";
import RecentCalls from "./RecentCalls";
import type { AccessRole } from "@/types/database";

export interface Stats {
  totalCalls:        number;
  avgScore:          number | null;
  scorableRate:      number;
  activeAgents:      number;
  totalCallsChange:  number;
  avgScoreChange:    number;
}

export interface RecentCallItem {
  id:        string;
  agent:     string;
  contact:   string;
  direction: "inbound" | "outbound";
  stage:     string | null;
  score:     number | null;
  result:    string | null;
  duration:  string;
}

export interface DashboardData {
  stats:             Stats;
  callVolume:        { day: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  recentCalls:       RecentCallItem[];
}

interface Props {
  data:           DashboardData;
  companyData?:   DashboardData;
  accessRole:     AccessRole;
  userName:       string;
}

export default function DashboardClient({ data, companyData, accessRole, userName }: Props) {
  const [view, setView] = useState<"my" | "company">("my");
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const showToggle = accessRole === "user" && companyData !== undefined;
  const active     = showToggle && view === "company" ? companyData! : data;
  const display    = userName.split(" ")[0] || userName;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1200, position: "relative" }}>

      {/* Ambient orbs */}
      <div style={{ position: "fixed", top: "10%", right: "8%", width: 320, height: 320, borderRadius: "50%", background: "rgba(252,175,23,0.04)", filter: "blur(90px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "15%", right: "20%", width: 260, height: 260, borderRadius: "50%", background: "rgba(67,183,73,0.04)", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Mic size={12} style={{ color: "#307DC0" }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#307DC0", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Sales Coach
            </p>
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, margin: "0 0 8px",
            background: "linear-gradient(135deg, #ffffff 40%, rgba(67,183,73,0.75) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            {greeting}, {display}
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            Here&apos;s how your team is performing.
          </p>
        </div>

        {showToggle && (
          <div style={{
            display: "flex", borderRadius: 12, overflow: "hidden", flexShrink: 0, marginTop: 4,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            padding: 3, gap: 3,
          }}>
            {(["my", "company"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "6px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: view === v ? "linear-gradient(135deg, rgba(48,125,192,0.3) 0%, rgba(48,125,192,0.15) 100%)" : "transparent",
                  color:  view === v ? "#fff"    : "#475569",
                  border: `1px solid ${view === v ? "rgba(48,125,192,0.35)" : "transparent"}`,
                  transition: "all 0.15s",
                }}
              >
                {v === "my" ? "My Stats" : "Company Stats"}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Stat cards ── */}
      <DashboardStats stats={active.stats} />

      {/* ── Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, marginTop: 24 }}>
        <CallsChart data={active.callVolume} />
        <ScoreDistribution data={active.scoreDistribution} />
      </div>

      {/* ── Recent calls ── */}
      <div style={{ marginTop: 24 }}>
        <RecentCalls calls={active.recentCalls} />
      </div>
    </div>
  );
}
