"use client";

import { motion } from "framer-motion";
import { Phone, ArrowUpRight, ArrowDownLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { RecentCallItem } from "./DashboardClient";

interface Props { calls: RecentCallItem[]; }

const resultStyle = (r: string | null) => {
  if (!r) return { color: "#64748b", bg: "rgba(100,116,139,0.08)" };
  const l = r.toLowerCase();
  if (l.includes("book") || l.includes("converted") || l.includes("signed"))
    return { color: "#43B749", bg: "rgba(67,183,73,0.1)" };
  if (l.includes("not") || l.includes("disqualif"))
    return { color: "#ED1F24", bg: "rgba(237,31,36,0.1)" };
  if (l.includes("follow") || l.includes("nurture"))
    return { color: "#FCAF17", bg: "rgba(252,175,23,0.1)" };
  return { color: "#64748b", bg: "rgba(100,116,139,0.08)" };
};

function scoreColor(s: number | null) {
  if (s === null) return { color: "#475569", rgb: "71,85,105" };
  if (s >= 80) return { color: "#43B749", rgb: "67,183,73" };
  if (s >= 60) return { color: "#307DC0", rgb: "48,125,192" };
  if (s >= 40) return { color: "#FCAF17", rgb: "252,175,23" };
  return { color: "#ED1F24", rgb: "237,31,36" };
}

const row = {
  hidden: { opacity: 0, y: 8 },
  show:   (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.32, delay: 0.45 + i * 0.05 } }),
};

export default function RecentCalls({ calls }: Props) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      transition={{ duration: 0.45, delay: 0.42 }}
      style={{
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Recent Calls</h3>
          <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>Latest Activity Across Your Team</p>
        </div>
        <Link href="/sales-coach/live-calls" style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, fontWeight: 700, color: "#307DC0", textDecoration: "none",
          background: "rgba(48,125,192,0.1)", border: "1px solid rgba(48,125,192,0.2)",
          padding: "6px 12px", borderRadius: 9, transition: "background 0.15s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(48,125,192,0.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(48,125,192,0.1)")}
        >
          View All <ChevronRight size={13} />
        </Link>
      </div>

      {calls.length === 0 ? (
        <div style={{ padding: "56px 16px", textAlign: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, margin: "0 auto 10px",
            background: "rgba(48,125,192,0.08)", border: "1px solid rgba(48,125,192,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Phone size={18} style={{ color: "#334155" }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#334155", margin: "0 0 4px" }}>No Calls Yet</p>
          <p style={{ fontSize: 12, color: "#1e293b", margin: 0 }}>Calls Will Appear Here Once Ingested.</p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.015)" }}>
              {["Agent", "Contact", "Stage", "Duration", "Score", "Result"].map((h, i) => (
                <th key={h} style={{
                  padding: "10px 16px", textAlign: "left",
                  fontSize: 10, fontWeight: 800, color: "#e2e8f0",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  paddingLeft: i === 0 ? 24 : 16,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.map((c, i) => {
              const rs = resultStyle(c.result);
              const sc = scoreColor(c.score);
              return (
                <motion.tr
                  key={c.id} custom={i} variants={row} initial="hidden" animate="show"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.12s", cursor: "default" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(48,125,192,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Agent */}
                  <td style={{ padding: "12px 16px 12px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                        background: "rgba(48,125,192,0.12)", border: "1px solid rgba(48,125,192,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800, color: "#78ABD6",
                      }}>
                        {c.agent[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{c.agent}</span>
                    </div>
                  </td>

                  {/* Contact + direction */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        display: "flex", alignItems: "center", gap: 3,
                        fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5,
                        ...(c.direction === "outbound"
                          ? { color: "#43B749", background: "rgba(67,183,73,0.1)" }
                          : { color: "#307DC0", background: "rgba(48,125,192,0.1)" }),
                      }}>
                        {c.direction === "outbound"
                          ? <ArrowUpRight size={10} />
                          : <ArrowDownLeft size={10} />}
                        {c.direction === "outbound" ? "OUT" : "IN"}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{c.contact}</span>
                    </div>
                  </td>

                  {/* Stage */}
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{c.stage ?? "—"}</span>
                  </td>

                  {/* Duration */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Phone size={10} style={{ color: "#334155" }} />
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: "#64748b" }}>{c.duration}</span>
                    </div>
                  </td>

                  {/* Score */}
                  <td style={{ padding: "12px 16px" }}>
                    {c.score !== null ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", maxWidth: 52 }}>
                          <motion.div
                            style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${sc.color}, rgba(${sc.rgb},0.5))` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${c.score}%` }}
                            transition={{ duration: 0.8, delay: 0.5 + i * 0.05, ease: "easeOut" }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: sc.color, minWidth: 24 }}>{c.score}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#334155" }}>—</span>
                    )}
                  </td>

                  {/* Result */}
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
                      color: rs.color, background: rs.bg,
                    }}>
                      {c.result ?? "—"}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      )}
    </motion.div>
  );
}
