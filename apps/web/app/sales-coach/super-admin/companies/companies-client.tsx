"use client";

import { useState } from "react";
import { Plus, Trash2, Building2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createCompany, deleteCompany } from "@/app/actions/sales-coach/companies";
import { addCredits } from "@/app/actions/sales-coach/credits";
import type { CompanyWithCount } from "@/types/database";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CompaniesClient({ companies }: { companies: CompanyWithCount[] }) {
  const [open,   setOpen]   = useState(false);
  const [name,   setName]   = useState("");
  const [ghlId,  setGhlId]  = useState("");
  const [err,    setErr]    = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [delId,      setDelId]      = useState<string | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const [creditCompany, setCreditCompany] = useState<CompanyWithCount | null>(null);
  const [creditAmt,     setCreditAmt]     = useState("100");
  const [creditErr,     setCreditErr]     = useState<string | null>(null);
  const [creditSaving,  setCreditSaving]  = useState(false);

  async function handleCreate() {
    if (!name.trim()) { setErr("Company name is required."); return; }
    setSaving(true); setErr(null);
    try {
      await createCompany({ name, ghl_sub_account_id: ghlId });
      setOpen(false); setName(""); setGhlId("");
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to create company."); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!delId) return;
    setDelLoading(true);
    try { await deleteCompany(delId); setDelId(null); }
    catch { /* toast future */ }
    finally { setDelLoading(false); }
  }

  async function handleAddCredits() {
    if (!creditCompany) return;
    const amt = parseInt(creditAmt, 10);
    if (isNaN(amt) || amt < 1) { setCreditErr("Enter a valid amount."); return; }
    setCreditSaving(true); setCreditErr(null);
    try {
      await addCredits(creditCompany.id, amt);
      setCreditCompany(null); setCreditAmt("100");
    } catch (e) { setCreditErr(e instanceof Error ? e.message : "Failed."); }
    finally { setCreditSaving(false); }
  }

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold gradient-text">Companies</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            {companies.length} company{companies.length !== 1 ? "ies" : ""}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus size={14} /> New Company
        </Button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>GHL Sub-Account ID</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 && (
              <TableRow>
                <TableCell className="text-center py-12" style={{ color: "#334155" }} colSpan={6}>
                  <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                  No companies yet
                </TableCell>
              </TableRow>
            )}
            {companies.map((c) => {
              const low = c.credits_balance <= 10;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "rgba(48,125,192,0.15)", color: "#78ABD6" }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-white">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono" style={{ color: c.ghl_sub_account_id ? "#64748b" : "#1e293b" }}>
                      {c.ghl_sub_account_id ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-white">{c.user_count}</span>
                    <span className="text-xs ml-1" style={{ color: "#334155" }}>users</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold" style={{ color: c.credits_balance === 0 ? "#ED1F24" : low ? "#FCAF17" : "#43B749" }}>
                      {c.credits_balance.toLocaleString()}
                    </span>
                    {low && c.credits_balance > 0 && (
                      <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(252,175,23,0.1)", color: "#FCAF17" }}>low</span>
                    )}
                    {c.credits_balance === 0 && (
                      <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(237,31,36,0.1)", color: "#ED1F24" }}>empty</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs" style={{ color: "#475569" }}>{fmt(c.created_at)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setCreditCompany(c); setCreditAmt("100"); setCreditErr(null); }}
                        className="p-1.5 rounded-lg transition-colors hover:bg-violet-500/10"
                        style={{ color: "#475569" }}
                        title="Add credits"
                      >
                        <Coins size={14} />
                      </button>
                      <AlertDialog open={delId === c.id} onOpenChange={(o) => !o && setDelId(null)}>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={() => setDelId(c.id)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                            style={{ color: "#334155" }}
                            title="Delete company"
                          >
                            <Trash2 size={14} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent
                          title="Delete company?"
                          description={`"${c.name}" and all associated data will be permanently removed.`}
                          confirmLabel="Delete"
                          onConfirm={handleDelete}
                          loading={delLoading}
                        />
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add Credits Modal */}
      <Dialog open={!!creditCompany} onOpenChange={(o) => !o && setCreditCompany(null)}>
        <DialogContent
          title={`Add Credits — ${creditCompany?.name}`}
          description="Credits are consumed when a scorable call is evaluated by AI.">
          <div className="space-y-4">
            <div>
              <Label htmlFor="credit-amt">Number of Credits</Label>
              <Input
                id="credit-amt"
                type="number"
                min={1}
                placeholder="100"
                value={creditAmt}
                onChange={(e) => setCreditAmt(e.target.value)}
              />
              {creditCompany && (
                <p className="text-xs mt-1.5" style={{ color: "#475569" }}>
                  Current balance: <span className="font-semibold text-white">{creditCompany.credits_balance.toLocaleString()}</span>
                  {" "}→ new balance will be{" "}
                  <span className="font-semibold" style={{ color: "#43B749" }}>
                    {(creditCompany.credits_balance + (parseInt(creditAmt, 10) || 0)).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
            {creditErr && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ED1F24", background: "rgba(237,31,36,0.08)" }}>{creditErr}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setCreditCompany(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAddCredits} disabled={creditSaving}>
              {creditSaving ? "Adding…" : "Add Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="New Company" description="Add a company to the platform.">
          <div className="space-y-4">
            <div>
              <Label htmlFor="co-name">Company Name *</Label>
              <Input id="co-name" placeholder="Acme Corp" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ghl-id">GHL Sub-Account ID</Label>
              <Input id="ghl-id" placeholder="optional" value={ghlId} onChange={(e) => setGhlId(e.target.value)} />
            </div>
            {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ED1F24", background: "rgba(237,31,36,0.08)" }}>{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
