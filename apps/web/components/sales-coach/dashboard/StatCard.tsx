"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";

interface Props {
  label:     string;
  value:     number;
  prefix?:   string;
  suffix?:   string;
  decimals?: number;
  change:    number;
  icon:      LucideIcon;
  iconColor: string;
  iconBg:    string;
  accentRgb: string;
  index:     number;
}

export default function StatCard({
  label, value, prefix, suffix, decimals,
  change, icon: Icon, iconColor, iconBg, accentRgb, index,
}: Props) {
  const positive = change >= 0;

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, boxShadow: `0 14px 40px rgba(${accentRgb},0.14)` }}
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid rgba(${accentRgb},0.18)`,
        borderRadius: 16, padding: "20px 22px",
        position: "relative", overflow: "hidden",
        cursor: "default", transition: "border-color 0.2s",
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, rgba(${accentRgb},0.9) 0%, rgba(${accentRgb},0.1) 100%)`,
      }} />

      {/* Corner glow */}
      <div style={{
        position: "absolute", top: -24, right: -24,
        width: 90, height: 90, borderRadius: "50%",
        background: `rgba(${accentRgb},0.07)`,
        filter: "blur(24px)", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            {label}
          </p>
          <p style={{ fontSize: 34, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.03em", lineHeight: 1 }}>
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
              color:      positive ? "#43B749" : "#ED1F24",
              background: positive ? "rgba(67,183,73,0.1)" : "rgba(237,31,36,0.1)",
            }}>
              {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(change)}%
            </div>
            <span style={{ fontSize: 11, color: "#334155" }}>Vs Last Week</span>
          </div>
        </div>

        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${iconBg} 0%, rgba(${accentRgb},0.04) 100%)`,
          border: `1px solid rgba(${accentRgb},0.2)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px rgba(${accentRgb},0.12)`,
        }}>
          <Icon size={19} style={{ color: iconColor }} />
        </div>
      </div>
    </motion.div>
  );
}
