"use client";

import { useState, useMemo } from "react";
import { Phone, Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { addPhone, removePhone } from "@/app/actions/training-coach/phones";

interface PhoneRow {
  id:            string;
  phone:         string;
  created_at:    string;
  user_name?:    string;
  company_id?:   string | null;
  company_name?: string | null;
}

interface Props {
  phones:       PhoneRow[];
  isSuperAdmin: boolean;
  companies:    { id: string; name: string }[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MyNumbersClient({ phones: initial, isSuperAdmin, companies }: Props) {
  const [phones,     setPhones]     = useState(initial);
  const [input,      setInput]      = useState("");
  const [adding,     setAdding]     = useState(false);
  const [err,        setErr]        = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [companyId,  setCompanyId]  = useState("all");

  async function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) { setErr("Enter a phone number."); return; }
    if (phones.some((p) => p.phone === trimmed)) { setErr("That number is already registered."); return; }
    setAdding(true); setErr(null);
    try {
      await addPhone(trimmed);
      setPhones((prev) => [
        ...prev,
        { id: crypto.randomUUID(), phone: trimmed, created_at: new Date().toISOString() },
      ]);
      setInput("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add number.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await removePhone(id);
      setPhones((prev) => prev.filter((p) => p.id !== id));
    } catch {
      //
    } finally {
      setRemovingId(null);
    }
  }

  const filtered = useMemo(() =>
    isSuperAdmin && companyId !== "all"
      ? phones.filter((p) => p.company_id === companyId)
      : phones,
  [phones, isSuperAdmin, companyId]);

  return (
    <div className="px-8 py-8">

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold gradient-text">
            {isSuperAdmin ? "All Registered Numbers" : "My Call Numbers"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            {isSuperAdmin
              ? "Phone numbers registered by reps across all companies."
              : "Register the numbers you call from so training calls get matched to your account."}
          </p>
        </div>

        {/* Company filter for super_admin */}
        {isSuperAdmin && companies.length > 0 && (
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger placeholder="All Companies" className="w-auto min-w-[160px] text-xs" />
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Info banner — only for regular users */}
        {!isSuperAdmin && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 14px", borderRadius: 12,
            background: "rgba(48,125,192,0.07)",
            border: "1px solid rgba(48,125,192,0.18)",
          }}>
            <Info size={14} style={{ color: "#307DC0", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, fontWeight: 500, color: "#7da8c8", margin: 0, lineHeight: 1.65 }}>
              When you call an AI training agent, Assistable sends your caller ID to our system.
              We match it against your registered numbers to score and log the call under your account.
            </p>
          </div>
        )}

        {/* Add card — hidden for super_admin */}
        {!isSuperAdmin && (
          <div className="glass rounded-2xl p-5">
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Add a number
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="+1 555 000 0000"
                style={{ flex: 1 }}
              />
              <Button size="sm" onClick={handleAdd} disabled={adding}>
                <Plus size={14} style={{ marginRight: 4 }} />
                {adding ? "Adding…" : "Add"}
              </Button>
            </div>
            {err && (
              <p style={{
                fontSize: 12, fontWeight: 500, marginTop: 10,
                color: "#ED1F24", background: "rgba(237,31,36,0.08)",
                padding: "7px 11px", borderRadius: 8,
              }}>
                {err}
              </p>
            )}
          </div>
        )}

        {/* Numbers list */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "8px 0 12px" }}>
            {isSuperAdmin ? `Numbers (${filtered.length})` : `Registered Numbers (${phones.length})`}
          </p>

          {filtered.length === 0 ? (
            <div className="glass rounded-2xl" style={{
              padding: "40px 24px", textAlign: "center",
              border: "1px dashed rgba(48,125,192,0.12)",
            }}>
              <Phone size={28} style={{ color: "#1e3a4a", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: "#475569", margin: 0 }}>
                {isSuperAdmin ? "No numbers registered for this company" : "No numbers registered yet"}
              </p>
              {!isSuperAdmin && (
                <p style={{ fontSize: 12, fontWeight: 400, color: "#334155", margin: "6px 0 0" }}>
                  Add a number above to get started
                </p>
              )}
            </div>
          ) : isSuperAdmin ? (
            /* Super admin: read-only table with user + company columns */
            <div className="glass rounded-2xl overflow-hidden">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(48,125,192,0.10)", background: "rgba(48,125,192,0.03)" }}>
                    {["Phone", "Rep", "Company", "Added"].map((h) => (
                      <th key={h} style={{
                        padding: "10px 18px", textAlign: "left",
                        fontSize: 10, fontWeight: 700, color: "#475569",
                        textTransform: "uppercase", letterSpacing: "0.08em",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(48,125,192,0.06)" : undefined }}
                    >
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                          {p.phone}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>{p.user_name ?? "—"}</span>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>{p.company_name ?? "—"}</span>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ fontSize: 12, color: "#475569" }}>{fmtDate(p.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Regular users: card list with delete */
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((p) => (
                <div key={p.id} className="glass rounded-xl" style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px",
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: "rgba(67,183,73,0.1)",
                    border: "1px solid rgba(67,183,73,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Phone size={14} style={{ color: "#43B749" }} />
                  </div>

                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                    {p.phone}
                  </span>

                  <span style={{ fontSize: 11, fontWeight: 500, color: "#334155", marginRight: 4 }}>
                    Added {fmtDate(p.created_at)}
                  </span>

                  <button
                    onClick={() => handleRemove(p.id)}
                    disabled={removingId === p.id}
                    title="Remove"
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 6, borderRadius: 7, color: "#475569",
                      opacity: removingId === p.id ? 0.4 : 1,
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ED1F24")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
