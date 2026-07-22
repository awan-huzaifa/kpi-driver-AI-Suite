"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface Props {
  data: { day: string; count: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(9,21,35,0.97)", border: "1px solid rgba(48,125,192,0.25)",
      backdropFilter: "blur(16px)", borderRadius: 12, padding: "10px 14px",
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#307DC0", display: "inline-block", boxShadow: "0 0 6px #307DC0" }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{payload[0]?.value ?? 0}</span>
        <span style={{ fontSize: 11, color: "#475569" }}>Calls</span>
      </div>
    </div>
  );
};

export default function CallsChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const peak  = Math.max(...data.map(d => d.count));

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "22px 24px", position: "relative", overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div style={{
        position: "absolute", bottom: -40, left: "30%",
        width: 200, height: 120, borderRadius: "50%",
        background: "rgba(48,125,192,0.05)", filter: "blur(40px)", pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 3px" }}>Call Volume</h3>
          <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Last 7 Days</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <TrendingUp size={13} style={{ color: "#43B749" }} />
            <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{total}</span>
          </div>
          <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0" }}>Total · Peak {peak}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#307DC0" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#307DC0" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(48,125,192,0.15)", strokeWidth: 1 }} />
          <Area
            type="monotone" dataKey="count"
            stroke="#307DC0" strokeWidth={2.5}
            fill="url(#callsGrad)"
            dot={false}
            activeDot={{ r: 5, fill: "#307DC0", stroke: "#0D1C2A", strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
