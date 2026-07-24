"use client";

import { useState } from "react";
import { Bot, Plus, Trash2, Phone, Eye, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { createAiAgent, deleteAiAgent } from "@/app/actions/training-coach/agents";
import type { AccessRole } from "@/types/database";

interface AiAgentRow {
  id:                 string;
  agent_name:         string;
  phone_number:       string;
  description:        string | null;
  external_agent_id:  string | null;
  created_at:         string;
  companies?:         { name: string } | null;
}

interface Props {
  agents:            AiAgentRow[];
  accessRole:        AccessRole;
  companies:         { id: string; name: string }[];
  currentCompanyId?: string | null;
}

const canManage = (role: AccessRole) => role === "super_admin";

export default function AgentsClient({ agents, accessRole, companies }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ agent_name: "", phone_number: "", description: "", external_agent_id: "", company_id: "global" });
  const [err,  setErr]  = useState<string | null>(null);
  const [load, setLoad] = useState(false);

  const [copied,       setCopied]       = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<AiAgentRow | null>(null);
  const [deleteLoad,   setDeleteLoad]   = useState(false);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCopy(id: string, phone: string) {
    await navigator.clipboard.writeText(phone);
    setCopied((prev) => { const n = new Set(prev); n.add(id); return n; });
    setTimeout(() => {
      setCopied((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }, 2000);
  }

  async function handleAdd() {
    if (!form.agent_name.trim())   { setErr("Agent Name Is Required."); return; }
    if (!form.phone_number.trim()) { setErr("Phone Number Is Required."); return; }

    setLoad(true); setErr(null);
    try {
      await createAiAgent({
        agent_name:        form.agent_name,
        phone_number:      form.phone_number,
        description:       form.description,
        external_agent_id: form.external_agent_id,
        company_id:        accessRole === "super_admin" && form.company_id !== "global" ? form.company_id : undefined,
      });
      setAddOpen(false);
      setForm({ agent_name: "", phone_number: "", description: "", external_agent_id: "", company_id: "global" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed To Add AI Agent.");
    } finally {
      setLoad(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoad(true);
    try { await deleteAiAgent(deleteTarget.id); setDeleteTarget(null); }
    catch { /* future toast */ }
    finally { setDeleteLoad(false); }
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold gradient-text">AI Agents</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            Pick An AI Agent And Tap The Card To Reveal The Number To Dial For That Practice Scenario.
          </p>
        </div>
        {canManage(accessRole) && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add AI Agent
          </Button>
        )}
      </div>

      {agents.length === 0 ? (
        <div className="glass rounded-2xl flex flex-col items-center justify-center py-24" style={{ color: "#475569" }}>
          <Bot size={32} className="mb-3 opacity-30" />
          <p className="text-sm">No AI Agents Registered Yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => {
            const isRevealed = revealed.has(a.id);
            return (
              <div key={a.id} className="glass rounded-2xl p-5 flex flex-col gap-3 relative">
                {canManage(accessRole) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(a); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: "#8b9cb0" }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(48,125,192,0.15)", color: "#78ABD6" }}>
                    <Bot size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{a.agent_name}</p>
                    <p className="text-xs truncate" style={{ color: "#8b9cb0" }}>
                      {a.companies?.name ?? <span style={{ color: '#307DC0', fontWeight: 700 }}>Global</span>}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-relaxed flex-1" style={{ color: "#94a3b8" }}>
                  {a.description ?? "No Description Provided."}
                </p>

                {isRevealed ? (
                  <div className="flex items-stretch gap-1.5">
                    <a
                      href={`tel:${a.phone_number}`}
                      className="flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                      style={{
                        background: "rgba(67,183,73,0.1)",
                        color: "#43B749",
                        border: "1px solid rgba(67,183,73,0.2)",
                        textDecoration: "none",
                      }}
                    >
                      <Phone size={13} />
                      {a.phone_number}
                    </a>
                    <button
                      onClick={() => handleCopy(a.id, a.phone_number)}
                      title="Copy number"
                      className="flex items-center justify-center px-3 rounded-xl transition-all"
                      style={{
                        background: copied.has(a.id) ? "rgba(67,183,73,0.12)" : "rgba(255,255,255,0.04)",
                        color:      copied.has(a.id) ? "#43B749" : "#64748b",
                        border:     `1px solid ${copied.has(a.id) ? "rgba(67,183,73,0.25)" : "rgba(255,255,255,0.08)"}`,
                        minWidth: 40,
                      }}
                    >
                      {copied.has(a.id) ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleReveal(a.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: "rgba(48,125,192,0.1)",
                      color: "#78ABD6",
                      border: "1px solid rgba(48,125,192,0.2)",
                    }}
                  >
                    <Eye size={13} /> Tap To Reveal Number
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add AI Agent" description="The Phone Number Assistable Assigned To This Bot — Stays Fixed Per Agent.">
          <div className="space-y-4">
            <div>
              <Label>Agent Name *</Label>
              <Input placeholder="Objection Handling Bot" value={form.agent_name} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input placeholder="Practices Handling Price Objections On A Cold Lead" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone Number *</Label>
                <Input placeholder="+1 555 0100" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
              </div>
              <div>
                <Label>Assistable Agent ID</Label>
                <Input placeholder="Optional" value={form.external_agent_id} onChange={(e) => setForm({ ...form, external_agent_id: e.target.value })} />
              </div>
            </div>
            {accessRole === "super_admin" && (
              <div>
                <Label>Company</Label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger placeholder="Select Company" />
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ED1F24", background: "rgba(237,31,36,0.08)" }}>{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={load}>{load ? "Adding…" : "Add Agent"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent
          title="Remove AI Agent?"
          description={`${deleteTarget?.agent_name} Will No Longer Be Recognized On Incoming Training Calls.`}
          confirmLabel="Remove"
          confirmVariant="destructive"
          onConfirm={handleDelete}
          loading={deleteLoad}
        />
      </AlertDialog>
    </div>
  );
}
