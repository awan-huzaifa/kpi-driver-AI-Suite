"use client";

import { motion } from "framer-motion";

interface Props {
  data: { range: string; count: number }[];
}

const BANDS = [
  { label: "0–20",   color: "#ED1F24", rgb: "237,31,36"   },
  { label: "21–40",  color: "#ED1F24", rgb: "237,31,36"   },
  { label: "41–60",  color: "#FCAF17", rgb: "252,175,23"  },
  { label: "61–80",  color: "#307DC0", rgb: "48,125,192"  },
  { label: "81–100", color: "#43B749", rgb: "67,183,73"   },
];

export default function ScoreDistribution({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const max   = Math.max(...data.map(d => d.count), 1);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.36 }}
      style={{
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "22px 24px",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 3px" }}>Score Distribution</h3>
        <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
          {total} scorable call{total !== 1 ? "s" : ""}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((d, i) => {
          const band   = BANDS[i];
          const pct    = total > 0 ? Math.round((d.count / total) * 100) : 0;
          const barPct = max > 0 ? (d.count / max) * 100 : 0;

          return (
            <div key={d.range}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: band.color }}>{d.range}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{d.count}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: band.color,
                    background: `rgba(${band.rgb},0.1)`, borderRadius: 99,
                    padding: "1px 6px", minWidth: 32, textAlign: "center",
                  }}>
                    {pct}%
                  </span>
                </div>
              </div>
              <div style={{
                height: 6, borderRadius: 99,
                background: "rgba(255,255,255,0.05)", overflow: "hidden",
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{
                    height: "100%", borderRadius: 99,
                    background: `linear-gradient(90deg, rgba(${band.rgb},0.9), rgba(${band.rgb},0.5))`,
                    boxShadow: `0 0 8px rgba(${band.rgb},0.3)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend summary */}
      {total > 0 && (
        <div style={{
          marginTop: 18, paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "space-between",
        }}>
          {[
            { label: "Poor", color: "#ED1F24" },
            { label: "Fair", color: "#FCAF17" },
            { label: "Good", color: "#43B749" },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "#475569", fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
