"use client";

import { useState, useRef, useEffect } from "react";
import { UserPlus, Pencil, UserX, UserCheck, Check, Mic, Building2, GraduationCap, NotebookPen, Database, Search, Camera, KeyRound, Eye, EyeOff, Bell, FileText, CreditCard, Lock } from "lucide-react";
import PlatformShell, { type Access } from "@/components/platform/PlatformShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { inviteUser, updateUser, removeUser, reactivateUser, updateUserAvatar, changeUserPassword } from "@/app/actions/admin/users";
import { setSuperAdminNotifications } from "@/app/actions/admin/notifications";
import type { PlanId } from "@kpidriver/auth/types";
import type { AccessRole, AgentType } from "@/types/database";
import { C } from "@/components/platform/brand";

interface UserRow {
  id:                   string;
  full_name:            string | null;
  email:                string | null;
  access_role:          AccessRole;
  agent_type:           AgentType;
  company_id:           string | null;
  avatar_url:           string | null;
  app_underwriting:     boolean;
  app_sales_coach:      boolean;
  app_training_coach:   boolean;
  app_note_taker:        boolean;
  app_data_enrichment:   boolean;
  app_skip_tracing:      boolean;
  is_active:             boolean;
  is_qa:                 boolean;
  created_at:           string;
  notify_reports:        boolean;
  notify_billing:        boolean;
  notify_reports_locked: boolean;
  notify_billing_locked: boolean;
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
  { value: "fus",       label: "FUS"       },
  { value: "acq",       label: "ACQ"       },
  { value: "tc",        label: "TC"        },
  { value: "cc",        label: "CC"        },
  { value: "dispo",     label: "DISPO"     },
  { value: "dispo_fus", label: "DISPO FUS" },
  { value: "tca",       label: "TCA"       },
];

const BLANK = {
  email: "", full_name: "",
  role: "user" as "user" | "admin",
  agent_type: "none" as AgentType,
  app_underwriting: false, app_sales_coach: false, app_training_coach: false, app_note_taker: false, app_data_enrichment: false, app_skip_tracing: false,
  is_qa: false,
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

function CompanySearchDropdown({
  companies,
  value,
  onChange,
}: {
  companies: Company[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const ref                 = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = query.trim()
    ? companies.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : companies;

  const selectedName = value ? (companies.find(c => c.id === value)?.name ?? "All Companies") : "All Companies";

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 220 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", borderRadius: 12, cursor: "pointer",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#f1f5f9", fontSize: 14, fontWeight: 500,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedName}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 8 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "#0F2032", border: "1px solid rgba(48,125,192,0.15)",
          borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", overflow: "hidden",
        }}>
          {/* Search input */}
          <div style={{ padding: "10px 10px 6px" }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search companies…"
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 8,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#f1f5f9", fontSize: 13, outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Options */}
          <div style={{ maxHeight: 220, overflowY: "auto", padding: "4px 6px 8px" }}>
            {/* All Companies option */}
            <button
              onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
              style={{
                width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8,
                background: value === "" ? "rgba(48,125,192,0.15)" : "transparent",
                color: value === "" ? "#f1f5f9" : "#94a3b8",
                fontSize: 13, fontWeight: value === "" ? 700 : 500, cursor: "pointer",
                border: "none", display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              All Companies
              {value === "" && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#307DC0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            {filtered.length === 0 && (
              <p style={{ fontSize: 13, color: "#475569", textAlign: "center", padding: "12px 0", margin: 0 }}>No results</p>
            )}

            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { onChange(c.id); setOpen(false); setQuery(""); }}
                style={{
                  width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8,
                  background: value === c.id ? "rgba(48,125,192,0.15)" : "transparent",
                  color: value === c.id ? "#f1f5f9" : "#94a3b8",
                  fontSize: 13, fontWeight: value === c.id ? 700 : 500, cursor: "pointer",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                {value === c.id && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#307DC0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 6 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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

  const [removeTarget, setRemoveTarget]       = useState<UserRow | null>(null);
  const [removeLoad, setRemoveLoad]           = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState<UserRow | null>(null);
  const [reactivateLoad, setReactivateLoad]     = useState(false);

  const [editAvatarUrl, setEditAvatarUrl]   = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarErr, setAvatarErr]           = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pwTarget,  setPwTarget]  = useState<UserRow | null>(null);
  const [pwNew,     setPwNew]     = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShow,    setPwShow]    = useState(false);
  const [pwErr,     setPwErr]     = useState<string | null>(null);
  const [pwLoad,    setPwLoad]    = useState(false);
  const [pwDone,    setPwDone]    = useState(false);

  // Notification prefs state (for super admin edit of another user's prefs)
  const [editNotifReports, setEditNotifReports] = useState(true);
  const [editNotifBilling, setEditNotifBilling] = useState(false);
  const [notifLoad, setNotifLoad] = useState(false);
  const [notifDone, setNotifDone] = useState(false);
  const [notifErr,  setNotifErr]  = useState<string | null>(null);

  function openEdit(u: UserRow) {
    setEditTarget(u);
    setEditAvatarUrl(u.avatar_url);
    setAvatarErr(null);
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
      is_qa:               u.is_qa ?? false,
      company_id:          u.company_id ?? "",
    });
    setEditNotifReports(u.notify_reports ?? true);
    setEditNotifBilling(u.notify_billing ?? false);
    setNotifErr(null);
    setNotifDone(false);
    setEditErr(null);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editTarget) return;
    setAvatarUploading(true);
    setAvatarErr(null);
    const preview = URL.createObjectURL(file);
    setEditAvatarUrl(preview);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const url = await updateUserAvatar(editTarget.id, fd);
      setEditAvatarUrl(url);
    } catch (err) {
      setAvatarErr(err instanceof Error ? err.message : "Upload failed.");
      setEditAvatarUrl(editTarget.avatar_url);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleInvite() {
    if (!form.email.trim()) { setInviteErr("Email Is Required."); return; }
    setInviteLoad(true); setInviteErr(null);
    try {
      await inviteUser({ ...form });
      setInviteOpen(false);
      setForm(BLANK);
    } catch (e) {
      setInviteErr(e instanceof Error ? e.message : "Failed To Send Invite.");
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
        is_qa:               editForm.is_qa,
      });
      setEditTarget(null);
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Failed To Update User.");
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

  async function handleReactivate() {
    if (!reactivateTarget) return;
    setReactivateLoad(true);
    try { await reactivateUser(reactivateTarget.id); setReactivateTarget(null); }
    catch { /* future toast */ }
    finally { setReactivateLoad(false); }
  }

  async function handleSaveNotifications() {
    if (!editTarget) return;
    setNotifLoad(true); setNotifErr(null); setNotifDone(false);
    try {
      await setSuperAdminNotifications(editTarget.id, {
        notify_reports: editNotifReports,
        notify_billing: editNotifBilling,
      });
      setNotifDone(true);
      setTimeout(() => setNotifDone(false), 2000);
    } catch (e) {
      setNotifErr(e instanceof Error ? e.message : "Failed to update notifications.");
    } finally {
      setNotifLoad(false);
    }
  }

  async function handleChangePassword() {
    if (!pwTarget) return;
    if (!pwNew) { setPwErr("Please enter a new password."); return; }
    if (pwNew.length < 8) { setPwErr("Password must be at least 8 characters."); return; }
    if (pwNew !== pwConfirm) { setPwErr("Passwords do not match."); return; }
    setPwLoad(true); setPwErr(null);
    try {
      await changeUserPassword(pwTarget.id, pwNew);
      setPwDone(true);
      setTimeout(() => { setPwTarget(null); setPwNew(""); setPwConfirm(""); setPwShow(false); setPwDone(false); }, 1500);
    } catch (e) {
      setPwErr(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setPwLoad(false);
    }
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
              Manage Who Has Access And Which Apps They Can Use.
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
              Filter By Company:
            </span>
            <CompanySearchDropdown
              companies={companies}
              value={selectedCompany}
              onChange={setSelectedCompany}
            />
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
                    No Team Members Yet — Invite Your First One.
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
                      {u.agent_type === "none"
                        ? (u.access_role === "admin" || u.access_role === "super_admin" ? "Admin" : "User")
                        : u.agent_type === "dispo_fus" ? "DISPO FUS" : u.agent_type.toUpperCase()}
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
                      <AppChip active={u.app_skip_tracing}    icon={Search}        label="Skiptracing" />
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
                        <button
                          onClick={() => { setPwTarget(u); setPwNew(""); setPwConfirm(""); setPwShow(false); setPwErr(null); setPwDone(false); }}
                          title="Change Password"
                          style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#8b9cb0" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#FCAF17")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#8b9cb0")}
                        >
                          <KeyRound size={13} />
                        </button>
                        {u.is_active ? (
                          <button
                            onClick={() => setRemoveTarget(u)}
                            title="Deactivate"
                            style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#8b9cb0" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ED1F24")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#8b9cb0")}
                          >
                            <UserX size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setReactivateTarget(u)}
                            title="Reactivate"
                            style={{ padding: 6, borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: "#8b9cb0" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = C.green)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#8b9cb0")}
                          >
                            <UserCheck size={13} />
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

      {/* â”€â”€ Invite Modal â”€â”€ */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent title="Invite Team Member" description="They'll Receive An Email With A Link To Set Their Password.">
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
                  checked={form.app_skip_tracing} icon={Search} label="Skiptracing"
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

      {/* â”€â”€ Edit Modal â”€â”€ */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent title="Edit Member" description={editTarget?.email ?? ""}>
          <div className="space-y-4">

            {/* Avatar upload */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                onClick={() => !avatarUploading && fileInputRef.current?.click()}
                style={{
                  width: 64, height: 64, borderRadius: 16, flexShrink: 0,
                  background: "rgba(48,125,192,0.15)", border: `2px solid ${avatarUploading ? C.blue : "rgba(48,125,192,0.25)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.blue, fontSize: 22, fontWeight: 800, overflow: "hidden",
                  cursor: avatarUploading ? "default" : "pointer", position: "relative",
                }}
                title="Click to change photo"
              >
                {editAvatarUrl
                  ? <img src={editAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initials(editTarget?.full_name ?? null, editTarget?.email ?? null)}
                <div
                  style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.45)", opacity: avatarUploading ? 1 : 0, transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!avatarUploading) (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { if (!avatarUploading) (e.currentTarget as HTMLElement).style.opacity = "0"; }}
                >
                  {avatarUploading
                    ? <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    : <Camera size={18} color="#fff" />}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0 }}>Profile Photo</p>
                <p style={{ fontSize: 11, color: "#475569", margin: "3px 0 0" }}>Click The Avatar To Upload A New Photo.</p>
                {avatarErr && <p style={{ fontSize: 11, color: "#ED1F24", margin: "4px 0 0" }}>{avatarErr}</p>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
            </div>

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

            {/* QA role toggle — only relevant for admin users */}
            {editForm.role === "admin" && (
              <div style={{ paddingTop: 4 }}>
                <Label style={{ marginBottom: 6, display: "block" }}>QA Role</Label>
                <AppCheckbox
                  checked={editForm.is_qa} icon={KeyRound} label="QA — Can review and resolve score disputes"
                  onChange={(v) => setEditForm({ ...editForm, is_qa: v })}
                />
              </div>
            )}

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
                  checked={editForm.app_skip_tracing} icon={Search} label="Skiptracing"
                  onChange={(v) => setEditForm({ ...editForm, app_skip_tracing: v })}
                />
              </div>
            </div>

            {/* Notification controls — super admin editing a company admin only */}
            {isSuperAdmin && editTarget && editTarget.access_role === "admin" && (
              <div style={{
                paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Bell size={14} style={{ color: C.blue }} />
                  <Label style={{ margin: 0, color: C.white }}>Notification Settings</Label>
                  {editTarget.notify_reports_locked && <Lock size={11} style={{ color: "#FCAF17" }} />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Report emails */}
                  <button
                    type="button"
                    onClick={() => setEditNotifReports(v => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10,
                      background: editNotifReports ? "rgba(48,125,192,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${editNotifReports ? "rgba(48,125,192,0.3)" : "rgba(255,255,255,0.07)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: editNotifReports ? C.blue : "transparent",
                      border: `1.5px solid ${editNotifReports ? C.blue : "#4a5a6a"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {editNotifReports && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <FileText size={13} style={{ color: editNotifReports ? C.blue : "#6b7a8a", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: editNotifReports ? "#e2e8f0" : "#6b7a8a", flex: 1, textAlign: "left" }}>
                      Report Emails
                    </span>
                    {!editNotifReports && (
                      <span style={{ fontSize: 10, color: "#FCAF17", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                        <Lock size={9} /> Admin Locked Out
                      </span>
                    )}
                  </button>

                  {/* Billing emails */}
                  <button
                    type="button"
                    onClick={() => setEditNotifBilling(v => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10,
                      background: editNotifBilling ? "rgba(48,125,192,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${editNotifBilling ? "rgba(48,125,192,0.3)" : "rgba(255,255,255,0.07)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: editNotifBilling ? C.blue : "transparent",
                      border: `1.5px solid ${editNotifBilling ? C.blue : "#4a5a6a"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {editNotifBilling && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <CreditCard size={13} style={{ color: editNotifBilling ? C.blue : "#6b7a8a", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: editNotifBilling ? "#e2e8f0" : "#6b7a8a", flex: 1, textAlign: "left" }}>
                      Billing Notifications
                    </span>
                    {!editNotifBilling && (
                      <span style={{ fontSize: 10, color: "#FCAF17", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                        <Lock size={9} /> Admin Locked Out
                      </span>
                    )}
                  </button>
                </div>

                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleSaveNotifications}
                    disabled={notifLoad}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
                      background: "rgba(48,125,192,0.12)", border: "1px solid rgba(48,125,192,0.25)",
                      color: C.blue, cursor: notifLoad ? "default" : "pointer",
                    }}
                  >
                    {notifLoad ? "Saving…" : "Save Notification Preferences"}
                  </button>
                  {notifDone && <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>Saved</span>}
                  {notifErr  && <span style={{ fontSize: 12, fontWeight: 600, color: "#ED1F24" }}>{notifErr}</span>}
                </div>
                <p style={{ fontSize: 11, color: C.dimText, margin: "6px 0 0" }}>
                  Turning Off A Setting Here Locks It — The Admin Cannot Re-Enable It Themselves.
                </p>
              </div>
            )}

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

      {/* â”€â”€ Remove Confirm â”€â”€ */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent
          title="Deactivate Member?"
          description={`${removeTarget?.full_name ?? removeTarget?.email} Will Lose Access Immediately. You Can Reactivate Them Later.`}
          confirmLabel="Deactivate"
          confirmVariant="destructive"
          onConfirm={handleRemove}
          loading={removeLoad}
        />
      </AlertDialog>

      {/* ── Reactivate Confirm ── */}
      <AlertDialog open={!!reactivateTarget} onOpenChange={(o) => !o && setReactivateTarget(null)}>
        <AlertDialogContent
          title="Reactivate Member?"
          description={`${reactivateTarget?.full_name ?? reactivateTarget?.email} Will Regain Full Access Immediately.`}
          confirmLabel="Reactivate"
          confirmVariant="primary"
          onConfirm={handleReactivate}
          loading={reactivateLoad}
        />
      </AlertDialog>

      {/* ── Change Password Modal ── */}
      <Dialog open={!!pwTarget} onOpenChange={(o) => { if (!o) { setPwTarget(null); setPwNew(""); setPwConfirm(""); setPwShow(false); setPwErr(null); setPwDone(false); } }}>
        <DialogContent
          title="Change Password"
          description={`Set A New Password For ${pwTarget?.full_name ?? pwTarget?.email ?? "This User"}.`}
        >
          <div className="space-y-4">
            <div>
              <Label>New Password</Label>
              <div style={{ position: "relative" }}>
                <Input
                  type={pwShow ? "text" : "password"}
                  placeholder="Min. 8 Characters"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setPwShow(s => !s)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 0 }}
                >
                  {pwShow ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type={pwShow ? "text" : "password"}
                placeholder="Repeat New Password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
            </div>
            {pwErr && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ED1F24", background: "rgba(237,31,36,0.08)" }}>
                {pwErr}
              </p>
            )}
            {pwDone && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#43B749", background: "rgba(67,183,73,0.08)" }}>
                Password Changed Successfully.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setPwTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={handleChangePassword} disabled={pwLoad || pwDone}>
              {pwLoad ? "Saving…" : pwDone ? "Done" : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformShell>
  );
}
