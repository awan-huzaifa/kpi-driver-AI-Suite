"use client";

import { useState } from "react";
import { UserPlus, Pencil, UserX, Check, Mic, Building2, GraduationCap, NotebookPen, Database, Search } from "lucide-react";
import PlatformShell, { type Access } from "@/components/platform/PlatformShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { inviteUser, updateUser, removeUser } from "@/app/actions/admin/users";
import type { PlanId } from "@kpidriver/auth/types";
import type { AccessRole, AgentType } from "@/types/database";
import { C } from "@/components/platform/brand";

interface UserRow {
  id:                 string;
  full_name:          string | null;
  email:              string | null;
  access_role:        AccessRole;
  agent_type:         AgentType;
  company_id:         string | null;
  avatar_url:         string | null;
  app_underwriting:   boolean;
  app_sales_coach:    boolean;
  app_training_coach: boolean;
  app_note_taker:      boolean;
  app_data_enrichment: boolean;
  app_skip_tracing:    boolean;
  is_active:           boolean;
  created_at:         string;
}

interface Company {
  id:   string;
  name: string;
}

interface Props {
  users:       UserRow[];
  companies:   Company[];
  currentUserId: string;
  accessRole:  AccessRole;
  planId:      PlanId | null;
  access:      Access;
  currentUser: { email: string; fullName: string | null };
}

const AGENT_OPTS: { value: AgentType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fus",       label: "FUS"               },
  { value: "acq",       label: "ACQ"               },
  { value: "dispo",     label: "DISPO"             },
  { value: "dispo_fus", label: "DISPO FUS"         },
  { value: "tca",       label: "TCA"               },
  { value: "tc",   label: "TC" },
  { value: "cc",   label: "CC" },
];

const BLANK = {
  email: "", full_name: "",
  role: "user" as "user" | "admin",
  agent_type: "none" as AgentType,
  app_underwriting: false, app_sales_coach: false, app_training_coach: false, app_note_taker: false, app_data_enrichment: false, app_skip_tracing: false,
  company_id: "",
};

function initials(name: string | null, email: string | null) {
  const src = name ?? email ?? "?";
  return src[0]?.toUpperCase() ?? "?";
}

function roleBadge(role: AccessRole) {
  const cfg: Record<AccessRole, { label: string; color: string; bg: string }> = {
    super_admin: { label: "Super Admin", color: "#FCAF17", bg: "rgba(252,175,23,0.12)" },
    admin:       { label: "Admin",       color: "#307DC0", bg: "rgba(48,125,192,0.12)" },
    user:        { label: "User",        color: "#8b9cb0", bg: "rgba(139,156,176,0.1)" },
  };
  const { label, color, bg } = cfg[role];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: "2px 8px", borderRadius: 99, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

function AppChip({ active, icon: Icon, label }: { active: boolean; icon: React.ElementType; label: string }) {
  return (
    <span title={label} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 24, height: 24, borderRadius: 6,
      background: active ? "rgba(48,125,192,0.15)" : "rgba(139,156,176,0.06)",
      color: active ? C.blue : "#3a4a5a",
      border: `1px solid ${active ? "rgba(48,125,192,0.25)" : "rgba(139,156,176,0.1)"}`,
    }}>
      <Icon size={12} />
    </span>
  );
}

function AppCheckbox({ checked, onChange, icon: Icon, label }: {
  checked: boolean; onChange: (v: boolean) => void;
  icon: React.ElementType; label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 10, width: "100%",
        background: checked ? "rgba(48,125,192,0.1)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${checked ? "rgba(48,125,192,0.3)" : "rgba(255,255,255,0.07)"}`,
        cursor: "pointer", textAlign: "left",
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        background: checked ? C.blue : "transparent",
        border: `1.5px solid ${checked ? C.blue : "#4a5a6a"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <Check size={11} color="#fff" strokeWidth={3} />}
      </div>
      <Icon size={14} style={{ color: checked ? C.blue : "#6b7a8a", flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: checked ? "#e2e8f0" : "#6b7a8a" }}>{label}</span>
    </button>
  );
}

export default function UsersClient({ users, companies, currentUserId, accessRole, planId, access, currentUser }: Props) {
  const isSuperAdmin = accessRole === "super_admin";
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  const [inviteOpen, setInviteOpen]   = useState(false);
  const [form, setForm]               = useState(BLANK);
  const [inviteErr, setInviteErr]     = useState<string | null>(null);
  const [inviteLoad, setInviteLoad]   = useState(false);

  const [editTarget, setEditTarget]   = useState<UserRow | null>(null);
  const [editForm, setEditForm]       = useState(BLANK);
  const [editErr, setEditErr]         = useState<string | null>(null);
  const [editLoad, setEditLoad]       = useState(false);

  const [removeTarget, setRemoveTarget] = useState<UserRow | null>(null);
  const [removeLoad, setRemoveLoad]     = useState(false);

  function openEdit(u: UserRow) {
    setEditTarget(u);
    setEditForm({
      email: u.email ?? "",
      full_name: u.full_name ?? "",
      role: u.access_role === "super_admin" ? "admin" : u.access_role,
      agent_type: u.agent_type,
      app_underwriting:   u.app_underwriting,
      app_sales_coach:    u.app_sales_coach,
      app_training_coach: u.app_training_coach,
      app_note_taker:      u.app_note_taker,
      app_data_enrichment: u.app_data_enrichment,
      app_skip_tracing:    u.app_skip_tracing,
      company_id:          u.company_id ?? "",
    });
    setEditErr(null);
  }

  async function handleInvite() {
    if (!form.email.trim()) { setInviteErr("Email is required."); return; }
    setInviteLoad(true); setInviteErr(null);
    try {
      await inviteUser({ ...form });
      setInviteOpen(false);
      setForm(BLANK);
    } catch (e) {
      setInviteErr(e instanceof Error ? e.message : "Failed to send invite.");
    } finally {
      setInviteLoad(false);
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    setEditLoad(true); setEditErr(null);
    try {
      await updateUser(editTarget.id, {
        role:                editForm.role,
        agent_type:          editForm.agent_type,
        app_underwriting:    editForm.app_underwriting,
        app_sales_coach:     editForm.app_sales_coach,
        app_training_coach:  editForm.app_training_coach,
        app_note_taker:      editForm.app_note_taker,
        app_data_enrichment: editForm.app_data_enrichment,
        app_skip_tracing:    editForm.app_skip_tracing,
      });
      setEditTarget(null);
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Failed to update user.");
    } finally {
      setEditLoad(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoveLoad(true);
    try { await removeUser(removeTarget.id); setRemoveTarget(null); }
    catch { /* future toast */ }
    finally { setRemoveLoad(false); }
  }

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));
  const filtered  = selectedCompany ? users.filter((u) => u.company_id === selectedCompany) : users;
  const active    = filtered.filter((u) => u.is_active);
  const inactive  = filtered.filter((u) => !u.is_active);

  return (
    <PlatformShell planId={planId} pageTitle="Users">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold gradient-text">Team Members</h1>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
              Manage who has access and which apps they can use.
            </p>
          </div>
          <Button size="sm" onClick={() => { setForm(BLANK); setInviteErr(null); setInviteOpen(true); }}>
            <UserPlus size={14} /> Invite Member
          </Button>
        </div>

        {/* Company filter — super_admin only */}
        {isSuperAdmin && companies.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
              Filter by company:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                onClick={() => setSelectedCompany("")}
                style={{
                  padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: selectedCompany === "" ? C.blue : "rgba(255,255,255,0.04)",
                  color: selectedCompany === "" ? "#fff" : "#8b9cb0",
                  border: `1px solid ${selectedCompany === "" ? C.blue : "rgba(255,255,255,0.1)"}`,
                }}
              >
                All Companies
              </button>
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompany(c.id)}
                  style={{
                    padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: selectedCompany === c.id ? C.blue : "rgba(255,255,255,0.04)",
                    color: selectedCompany === c.id ? "#fff" : "#8b9cb0",
                    border: `1px solid ${selectedCompany === c.id ? C.blue : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["Member", "Role", "Agent Type", "App Access", "Status", ""].map((h, i) => (
                  <th key={h || i} style={{
                    padding: "12px 16px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: "#475569",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.length === 0 && inactive.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "#475569", fontSize: 13 }}>
                    No team members yet — invite your first one.
                  </td>
                </tr>
              )}
              {[...active, ...inactive].map((u) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    opacity: u.is_active ? 1 : 0.45,
                  }}
                >
                  {/* Member */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: C.blue, fontSize: 13, fontWeight: 800, overflow: "hidden",
                      }}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={u.full_name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : initials(u.full_name, u.email)}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>
                          {u.full_name ?? "—"}
                          {u.id === currentUserId && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: C.blue, fontWeight: 700 }}>YOU</span>
                          )}
                        </p>
                        <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>{u.email ?? "—"}</p>
                        {isSuperAdmin && u.company_id && (
                          <p style={{ fontSize: 10, color: C.blue, margin: "2px 0 0", fontWeight: 600 }}>
                            {companyMap[u.company_id] ?? "Unknown Company"}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: "12px 16px" }}>{roleBadge(u.access_role)}</td>

                  {/* Agent Type */}
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 12, color: "#8b9cb0", fontWeight: 600 }}>
                      {u.agent_type === "none" ? "—" : u.agent_type === "dispo_fus" ? "DISPO FUS" : u.agent_type.toUpperCase()}
                    </span>
                  </td>

                  {/* App Access */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <AppChip active={u.app_sales_coach}    icon={Mic}           label="AI Sales Coach" />
                      <AppChip active={u.app_underwriting}   icon={Building2}     label="AI Deal Underwriting" />
                      <AppChip active={u.app_training_coach} icon={GraduationCap} label="AI Training Coach" />
                      <AppChip active={u.app_note_taker}      icon={NotebookPen}   label="AI Note Taker" />
                      <AppChip active={u.app_data_enrichment} icon={Database}      label="AI Data Enrichment" />
                      <AppChip active={u.app_skip_tracing}    icon={Search}        label="Skip Tracing" />
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: u.is_active ? C.green : "#475569" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: u.is_active ? C.green : "#475569", display: "inline-block" }} />
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "12px 16px" }}>
                    {u.id !== currentUserId && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit"
                          style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#8b9cb0" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.blue)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#8b9cb0")}
                        >
                          <Pencil size={13} />
                        </button>
                        {u.is_active && (
                          <button
                            onClick={() => setRemoveTarget(u)}
                            title="Deactivate"
                            style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#8b9cb0" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ED1F24")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#8b9cb0")}
                          >
                            <UserX size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Invite Modal ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent title="Invite Team Member" description="They'll receive an email with a link to set their password.">
          <div className="space-y-4">
            {/* Company picker — super_admin only */}
            {isSuperAdmin && companies.length > 0 && (
              <div>
                <Label>Company *</Label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger className="w-auto" />
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email" placeholder="rep@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "user" | "admin" })}>
                  <SelectTrigger className="w-auto" />
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agent Type</Label>
                <Select value={form.agent_type} onValueChange={(v) => setForm({ ...form, agent_type: v as AgentType })}>
                  <SelectTrigger className="w-auto" />
                  <SelectContent>
                    {AGENT_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>App Access</Label>
              <div className="space-y-2 mt-1.5">
                <AppCheckbox
                  checked={form.app_sales_coach} icon={Mic} label="AI Sales Coach"
                  onChange={(v) => setForm({ ...form, app_sales_coach: v })}
                />
                <AppCheckbox
                  checked={form.app_underwriting} icon={Building2} label="AI Deal Underwriting"
                  onChange={(v) => setForm({ ...form, app_underwriting: v })}
                />
                <AppCheckbox
                  checked={form.app_training_coach} icon={GraduationCap} label="AI Training Coach"
                  onChange={(v) => setForm({ ...form, app_training_coach: v })}
                />
                <AppCheckbox
                  checked={form.app_note_taker} icon={NotebookPen} label="AI Note Taker"
                  onChange={(v) => setForm({ ...form, app_note_taker: v })}
                />
                <AppCheckbox
                  checked={form.app_data_enrichment} icon={Database} label="AI Data Enrichment"
                  onChange={(v) => setForm({ ...form, app_data_enrichment: v })}
                />
                <AppCheckbox
                  checked={form.app_skip_tracing} icon={Search} label="Skip Tracing"
                  onChange={(v) => setForm({ ...form, app_skip_tracing: v })}
                />
              </div>
            </div>

            {inviteErr && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ED1F24", background: "rgba(237,31,36,0.08)" }}>
                {inviteErr}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleInvite} disabled={inviteLoad}>
              {inviteLoad ? "Sending…" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent title="Edit Member" description={editTarget?.email ?? ""}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as "user" | "admin" })}>
                  <SelectTrigger className="w-auto" />
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agent Type</Label>
                <Select value={editForm.agent_type} onValueChange={(v) => setEditForm({ ...editForm, agent_type: v as AgentType })}>
                  <SelectTrigger className="w-auto" />
                  <SelectContent>
                    {AGENT_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>App Access</Label>
              <div className="space-y-2 mt-1.5">
                <AppCheckbox
                  checked={editForm.app_sales_coach} icon={Mic} label="AI Sales Coach"
                  onChange={(v) => setEditForm({ ...editForm, app_sales_coach: v })}
                />
                <AppCheckbox
                  checked={editForm.app_underwriting} icon={Building2} label="AI Deal Underwriting"
                  onChange={(v) => setEditForm({ ...editForm, app_underwriting: v })}
                />
                <AppCheckbox
                  checked={editForm.app_training_coach} icon={GraduationCap} label="AI Training Coach"
                  onChange={(v) => setEditForm({ ...editForm, app_training_coach: v })}
                />
                <AppCheckbox
                  checked={editForm.app_note_taker} icon={NotebookPen} label="AI Note Taker"
                  onChange={(v) => setEditForm({ ...editForm, app_note_taker: v })}
                />
                <AppCheckbox
                  checked={editForm.app_data_enrichment} icon={Database} label="AI Data Enrichment"
                  onChange={(v) => setEditForm({ ...editForm, app_data_enrichment: v })}
                />
                <AppCheckbox
                  checked={editForm.app_skip_tracing} icon={Search} label="Skip Tracing"
                  onChange={(v) => setEditForm({ ...editForm, app_skip_tracing: v })}
                />
              </div>
            </div>

            {editErr && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ED1F24", background: "rgba(237,31,36,0.08)" }}>
                {editErr}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit} disabled={editLoad}>
              {editLoad ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Confirm ── */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent
          title="Deactivate member?"
          description={`${removeTarget?.full_name ?? removeTarget?.email} will lose access immediately. You can reactivate them later by editing their profile.`}
          confirmLabel="Deactivate"
          confirmVariant="destructive"
          onConfirm={handleRemove}
          loading={removeLoad}
        />
      </AlertDialog>
    </PlatformShell>
  );
}
