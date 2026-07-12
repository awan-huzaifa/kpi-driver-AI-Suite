"use client";

import { motion } from "framer-motion";
import { Phone, Star, Target, Users } from "lucide-react";
import StatCard from "./StatCard";
import type { Stats } from "./DashboardClient";

interface Props { stats: Stats; }

export default function DashboardStats({ stats }: Props) {
  const cards = [
    {
      label: "Total Calls", value: stats.totalCalls, change: stats.totalCallsChange,
      icon: Phone, iconColor: "#307DC0", iconBg: "rgba(48,125,192,0.15)", accentRgb: "48,125,192",
    },
    {
      label: "Avg Score", value: stats.avgScore ?? 0, suffix: "/100", change: stats.avgScoreChange,
      icon: Star, iconColor: "#FCAF17", iconBg: "rgba(252,175,23,0.12)", accentRgb: "252,175,23",
    },
    {
      label: "Scorable Rate", value: stats.scorableRate, suffix: "%", change: 0,
      icon: Target, iconColor: "#43B749", iconBg: "rgba(67,183,73,0.12)", accentRgb: "67,183,73",
    },
    {
      label: "Active Agents", value: stats.activeAgents, change: 0,
      icon: Users, iconColor: "#43B749", iconBg: "rgba(67,183,73,0.12)", accentRgb: "67,183,73",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}
    >
      {cards.map((s, i) => (
        <StatCard key={s.label} {...s} index={i} />
      ))}
    </motion.div>
  );
}
