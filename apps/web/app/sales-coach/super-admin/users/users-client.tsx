"use client";

import { useState } from "react";
import { UserPlus, Pencil, Trash2, MoreVertical, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { inviteUser, updateUser, deleteUser } from "@/app/actions/sales-coach/users";
import type { UserRow, Company, AccessRole, AgentType } from "@/types/database";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const ROLES:       { value: AccessRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin",       label: "Admin"       },
  { value: "user",        label: "User"        },
];
const AGENT_TYPES: { value: AgentType;  label: string }[] = [
  { value: "fus",       label: "FUS"       },
  { value: "acq",       label: "ACQ"       },
  { value: "dispo",     label: "DISPO"     },
  { value: "dispo_fus", label: "DISPO FUS" },
  { value: "tca",       label: "TCA"       },
  { value: "tc",   label: "TC"   },
  { value: "cc",   label: "CC"   },
  { value: "none", label: "None" },
];

interface Props { users: UserRow[]; companies: Pick<Company, "id" | "name">[]; }

export default function SuperAdminUsersClient({ users, companies }: Props) {
  // ── Invite state ─────────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inv, setInv] = useState({ email: "", full_name: "", phone: "", access_role: "user" as AccessRole, agent_type: "none" as AgentType, company_id: "" });
  const [invErr,  setInvErr]  = useState<string | null>(null);
  const [invLoad, setInvLoad] = useState(false);

  // ── Edit state ────────────────────────────────────────────────
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [edit, setEdit] = useState({ access_role: "user" as AccessRole, agent_type: "none" as AgentType, company_id: "" });
  const [editErr,  setEditErr]  = useState<string | null>(null);
  const [editLoad, setEditLoad] = useState(false);

  // ── Delete state ──────────────────────────────────────────────
  const [delId,   setDelId]   = useState<string | null>(null);
  const [delLoad, setDelLoad] = useState(false);

  // ── Filter state ───────────────────────────────────────────────
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const filteredUsers = companyFilter === "all"
    ? users
    : companyFilter === "none"
      ? users.filter((u) => !u.company_id)
      : users.filter((u) => u.company_id === companyFilter);

  // ── Handlers ─────────────────────────────────────────────────
  async function handleInvite() {
    if (!inv.email) { setInvErr("Email is required."); return; }
    if (!inv.full_name) { setInvErr("Full name is required."); return; }
    setInvLoad(true); setInvErr(null);
    try {
      await inviteUser({ ...inv, company_id: inv.company_id || undefined });
      setInviteOpen(false);
      setInv({ email: "", full_name: "", phone: "", access_role: "user", agent_type: "none", company_id: "" });
    } catch (e) { setInvErr(e instanceof Error ? e.message : "Failed to invite user."); }
    finally { setInvLoad(false); }
  }

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEdit({ access_role: u.access_role, agent_type: u.agent_type, company_id: u.company_id ?? "" });
    setEditErr(null);
  }

  async function handleEdit() {
    if (!editUser) return;
    setEditLoad(true); setEditErr(null);
    try {
      await updateUser(editUser.id, { access_role: edit.access_role, agent_type: edit.agent_type, company_id: edit.company_id || null });
      setEditUser(null);
    } catch (e) { setEditErr(e instanceof Error ? e.message : "Failed to update user."); }
    finally { setEditLoad(false); }
  }

  async function handleDelete() {
    if (!delId) return;
    setDelLoad(true);
    try { await deleteUser(delId); setDelId(null); }
    catch { /* future toast */ }
    finally { setDelLoad(false); }
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold gradient-text">All Users</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            {filteredUsers.length} {companyFilter === "all" ? `user${users.length !== 1 ? "s" : ""} across all companies` : "user(s) in this company"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger placeholder="All companies" className="min-w-[180px] text-xs py-2" />
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              <SelectItem value="none">No company</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={14} /> Invite User
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Agent Type</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell className="text-center py-12" style={{ color: "#334155" }} colSpan={8}>
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  {companyFilter === "all" ? "No users yet" : "No users in this company"}
                </TableCell>
              </TableRow>
            )}
            {filteredUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "rgba(48,125,192,0.15)", color: "#78ABD6" }}>
                      {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-white truncate max-w-[120px]">
                      {u.full_name ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell><span className="text-xs" style={{ color: "#64748b" }}>{u.email}</span></TableCell>
                <TableCell><Badge variant={u.access_role} /></TableCell>
                <TableCell><Badge variant={u.agent_type} /></TableCell>
                <TableCell>
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {(u.companies as any)?.name ?? "—"}
                  </span>
                </TableCell>
                <TableCell><span className="text-xs font-mono" style={{ color: "#475569" }}>{u.phone ?? "—"}</span></TableCell>
                <TableCell><span className="text-xs" style={{ color: "#334155" }}>{fmt(u.created_at)}</span></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#334155" }}>
                        <MoreVertical size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => openEdit(u)}>
                        <Pencil size={12} /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDelId(u.id)}>
                        <Trash2 size={12} /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent title="Invite User" description="Send an email invite. They set their own password.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Full Name *</Label>
                <Input placeholder="Jane Doe" value={inv.full_name} onChange={(e) => setInv({ ...inv, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="+1 555 0100" value={inv.phone} onChange={(e) => setInv({ ...inv, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" placeholder="jane@acme.com" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Access Role</Label>
                <Select value={inv.access_role} onValueChange={(v) => setInv({ ...inv, access_role: v as AccessRole })}>
                  <SelectTrigger placeholder="Role" />
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agent Type</Label>
                <Select value={inv.agent_type} onValueChange={(v) => setInv({ ...inv, agent_type: v as AgentType })}>
                  <SelectTrigger placeholder="Type" />
                  <SelectContent>
                    {AGENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Company</Label>
              <Select value={inv.company_id} onValueChange={(v) => setInv({ ...inv, company_id: v })}>
                <SelectTrigger placeholder="Assign to company" />
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {invErr && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ED1F24", background: "rgba(237,31,36,0.08)" }}>{invErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleInvite} disabled={invLoad}>{invLoad ? "Sending…" : "Send Invite"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent title="Edit User" description={editUser?.email ?? ""}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Access Role</Label>
                <Select value={edit.access_role} onValueChange={(v) => setEdit({ ...edit, access_role: v as AccessRole })}>
                  <SelectTrigger placeholder="Role" />
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agent Type</Label>
                <Select value={edit.agent_type} onValueChange={(v) => setEdit({ ...edit, agent_type: v as AgentType })}>
                  <SelectTrigger placeholder="Type" />
                  <SelectContent>
                    {AGENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Company</Label>
              <Select value={edit.company_id} onValueChange={(v) => setEdit({ ...edit, company_id: v })}>
                <SelectTrigger placeholder="Assign to company" />
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editErr && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ED1F24", background: "rgba(237,31,36,0.08)" }}>{editErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit} disabled={editLoad}>{editLoad ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent
          title="Delete user?"
          description="This permanently removes the user and all their data. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          loading={delLoad}
        />
      </AlertDialog>
    </div>
  );
}
