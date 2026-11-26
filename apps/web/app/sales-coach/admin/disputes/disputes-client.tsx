"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, Play } from "lucide-react";
import { resolveDispute, type DisputeRow } from "@/app/actions/sales-coach/disputes";
import { getDisputeCategories } from "@/lib/sales-coach/dispute-constants";
import AudioPlayer from "@/components/ui/AudioPlayer";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    pending:  { color: "#FCAF17", bg: "rgba(252,175,23,0.12)",  icon: Clock,         label: "Pending"  },
    accepted: { color: "#43B749", bg: "rgba(67,183,73,0.12)",   icon: CheckCircle2,  label: "Accepted" },
    rejected: { color: "#ED1F24", bg: "rgba(237,31,36,0.12)",   icon: XCircle,       label: "Rejected" },
  }[status] ?? { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: Clock, label: status };
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`,
    }}>
      <Icon size={11} />{cfg.label}
    </span>
  );
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = max > 0 ? Math.min((score / max) * 100, 100) : 0;
  const color = pct >= 70 ? "#43B749" : pct >= 50 ? "#FCAF17" : "#ED1F24";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{score}/{max}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: color, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

interface ResolveModalProps {
  dispute: DisputeRow;
  onClose: () => void;
  onResolved: (id: string, decision: "accepted" | "rejected", reason: string, newScore?: number) => void;
}

function ResolveModal({ dispute, onClose, onResolved }: ResolveModalProps) {
  const [decision, setDecision] = useState<"accepted" | "rejected">("accepted");
  const [reason, setReason] = useState("");
  const [newScore, setNewScore] = useState<string>(String(dispute.call?.score ?? ""));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason.trim()) { setErr("Resolution reason is required"); return; }
    const parsedScore = decision === "accepted" && newScore.trim() !== "" ? Number(newScore) : null;
    if (parsedScore != null && (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
      setErr("Score must be 0–100"); return;
    }
    setLoading(true); setErr(null);
    try {
      await resolveDispute(dispute.id, decision, reason.trim(), parsedScore);
      onResolved(dispute.id, decision, reason.trim(), parsedScore ?? undefined);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to resolve");
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#0F2032", border: "1px solid rgba(48,125,192,0.2)",
        borderRadius: 18, padding: 28, width: "100%", maxWidth: 480,
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px" }}>Resolve Dispute</h3>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 20px" }}>
          {dispute.rep?.full_name ?? "Rep"} · {dispute.category}
        </p>

        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Dispute Reason</p>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{dispute.reason}</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Decision</p>
          <div style={{ display: "flex", gap: 8 }}>
            {(["accepted", "rejected"] as const).map((d) => (
              <button key={d} onClick={() => setDecision(d)} style={{
                flex: 1, padding: "10px 16px", borderRadius: 10, cursor: "pointer",
                fontWeight: 700, fontSize: 13, border: "1.5px solid",
                background: decision === d ? (d === "accepted" ? "rgba(67,183,73,0.15)" : "rgba(237,31,36,0.15)") : "rgba(255,255,255,0.03)",
                borderColor: decision === d ? (d === "accepted" ? "#43B749" : "#ED1F24") : "rgba(255,255,255,0.08)",
                color: decision === d ? (d === "accepted" ? "#43B749" : "#ED1F24") : "#64748b",
              }}>
                {d === "accepted" ? "Accept" : "Reject"}
              </button>
            ))}
          </div>
        </div>

        {/* Score edit — only on accept */}
        {decision === "accepted" && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              New Score <span style={{ color: "#334155", fontWeight: 400, textTransform: "none" }}>(leave blank to keep {dispute.call?.score ?? "—"})</span>
            </p>
            <input
              type="number"
              min={0} max={100}
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              placeholder={String(dispute.call?.score ?? "")}
              style={{
                width: "100%", padding: "9px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#475569", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Resolution Reason</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Explain your decision to the rep..." rows={3}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10, resize: "vertical",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#e2e8f0", fontSize: 13, lineHeight: 1.6, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {err && <p style={{ fontSize: 12, color: "#ED1F24", margin: "0 0 12px" }}>{err}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8", fontSize: 13, fontWeight: 600,
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{
            flex: 1, padding: "10px", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
            background: decision === "accepted" ? "#43B749" : "#ED1F24",
            border: "none", color: "#fff", fontSize: 13, fontWeight: 700, opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "Resolving…" : `Confirm ${decision === "accepted" ? "Accept" : "Reject"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  disputes: DisputeRow[];
}

export default function DisputesClient({ disputes: initial }: Props) {
  const [disputes, setDisputes] = useState(initial);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("pending");
  const [resolving, setResolving] = useState<DisputeRow | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function handleResolved(id: string, decision: "accepted" | "rejected", reason: string, newScore?: number) {
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: decision,
              resolution_reason: reason,
              resolved_at: new Date().toISOString(),
              call: d.call && newScore != null ? { ...d.call, score: newScore } : d.call,
            }
          : d,
      ),
    );
  }

  const filtered = filter === "all" ? disputes : disputes.filter((d) => d.status === filter);
  const pendingCount = disputes.filter((d) => d.status === "pending").length;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0", margin: 0 }}>Score Disputes</h1>
          {pendingCount > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 99,
              background: "rgba(252,175,23,0.15)", color: "#FCAF17", border: "1px solid rgba(252,175,23,0.3)",
            }}>{pendingCount} pending</span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
          Reps can dispute a scored call within 7 days. Review the call, then accept or reject.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["pending", "all", "accepted", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: "pointer", border: "1px solid", textTransform: "capitalize",
            background: filter === f ? "rgba(48,125,192,0.15)" : "rgba(255,255,255,0.03)",
            borderColor: filter === f ? "rgba(48,125,192,0.4)" : "rgba(255,255,255,0.08)",
            color: filter === f ? "#307DC0" : "#64748b",
          }}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: "48px 24px", textAlign: "center",
          background: "rgba(255,255,255,0.02)", borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <p style={{ color: "#475569", fontSize: 14, margin: 0 }}>No disputes found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((d) => {
            const isOpen = expanded === d.id;
            const ev = d.call?.evaluation as Record<string, unknown> | null;
            const agentType = d.rep?.agent_type ?? null;
            const categories = getDisputeCategories(agentType);

            return (
              <div key={d.id} style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14, overflow: "hidden",
              }}>
                {/* Row header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer" }}
                  onClick={() => setExpanded(isOpen ? null : d.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                        {d.rep?.full_name ?? "Unknown Rep"}
                      </span>
                      <StatusBadge status={d.status} />
                      <span style={{ fontSize: 11, color: "#64748b", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
                        {d.category}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#475569" }}>
                        Stage: {d.call?.call_stage ?? "—"} &nbsp;·&nbsp; Score: {d.call?.score ?? "—"}
                      </span>
                      <span style={{ fontSize: 11, color: "#475569" }}>Submitted: {fmtDate(d.created_at)}</span>
                      {d.call?.created_at && (
                        <span style={{ fontSize: 11, color: "#475569" }}>Call: {fmtDate(d.call.created_at)}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {d.call?.crm_link && (
                      <a href={d.call.crm_link} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#307DC0", display: "flex", alignItems: "center" }}>
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {d.status === "pending" && (
                      <button onClick={(e) => { e.stopPropagation(); setResolving(d); }} style={{
                        padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                        background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.3)",
                        color: "#307DC0", fontSize: 12, fontWeight: 700,
                      }}>Resolve</button>
                    )}
                    <ChevronDown size={16} style={{
                      color: "#475569",
                      transform: isOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }} />
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

                    {/* Reason + Resolution side by side */}
                    <div style={{ display: "grid", gridTemplateColumns: d.resolution_reason ? "1fr 1fr" : "1fr", gap: 12 }}>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Dispute Reason</p>
                        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{d.reason}</p>
                      </div>
                      {d.resolution_reason && (
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Resolution</p>
                          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{d.resolution_reason}</p>
                        </div>
                      )}
                    </div>

                    {/* Score breakdown */}
                    {ev && (ev as any).core_score != null && (
                      <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "14px 16px" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Score Breakdown</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <ScoreBar label="Agent Core" score={(ev as any).core_score ?? 0} max={60} />
                          {!(ev as any).tw_applied && <ScoreBar label="FROM" score={(ev as any).from_score ?? 0} max={20} />}
                          <ScoreBar
                            label={(ev as any).tw_applied ? "TW (FROM+TO)" : "TO"}
                            score={(ev as any).to_score ?? 0}
                            max={(ev as any).tw_applied ? 40 : 20}
                          />
                        </div>

                        {/* Criteria list */}
                        {Array.isArray((ev as any).criteria) && (ev as any).criteria.length > 0 && (
                          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                            {((ev as any).criteria as any[]).map((c: any) => (
                              <div key={c.id} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "5px 8px", borderRadius: 7,
                                background: c.band === "fail" ? "rgba(237,31,36,0.08)" : "rgba(255,255,255,0.02)",
                              }}>
                                <span style={{ fontSize: 11, color: c.na ? "#334155" : "#94a3b8" }}>
                                  {c.id}{c.na ? " (N/A)" : ""}
                                </span>
                                <span style={{
                                  fontSize: 11, fontWeight: 700,
                                  color: c.band === "mastery" ? "#43B749" : c.band === "proficient" ? "#307DC0" : c.band === "developing" ? "#FCAF17" : "#ED1F24",
                                }}>
                                  {c.na ? "—" : `${c.earned} · ${c.band}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recording */}
                    {d.call?.recording_url && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Recording</p>
                        <AudioPlayer url={d.call.recording_url} />
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resolving && (
        <ResolveModal
          dispute={resolving}
          onClose={() => setResolving(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}
