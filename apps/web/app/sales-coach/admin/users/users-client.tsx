"use client";

import { useState } from "react";
import { Pencil, MoreVertical, UserX, UserCheck, Users, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { updateUser, setUserActive } from "@/app/actions/sales-coach/users";
import type { UserRow, AgentType } from "@/types/database";
import Link from "next/link";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const AGENT_TYPES: { value: AgentType; label: string }[] = [
  { value: "fus",  label: "FUS"  },
  { value: "acq",  label: "ACQ"  },
  { value: "tc",   label: "TC"   },
  { value: "cc",   label: "CC"   },
  { value: "none", label: "None" },
];

export default function AdminUsersClient({ users }: { users: UserRow[] }) {
  // ── Edit ──────────────────────────────────────────────────────
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editType, setEditType] = useState<AgentType>("none");
  const [editErr,  setEditErr]  = useState<string | null>(null);
  const [editLoad, setEditLoad] = useState(false);

  // ── Deactivate ────────────────────────────────────────────────
  const [toggleTarget, setToggleTarget] = useState<UserRow | null>(null);
  const [toggleLoad,   setToggleLoad]   = useState(false);

  async function handleEdit() {
    if (!editUser) return;
    setEditLoad(true); setEditErr(null);
    try {
      await updateUser(editUser.id, { agent_type: editType });
      setEditUser(null);
    } catch (e) { setEditErr(e instanceof Error ? e.message : "Failed to update user."); }
    finally { setEditLoad(false); }
  }

  async function handleToggle() {
    if (!toggleTarget) return;
    setToggleLoad(true);
    try { await setUserActive(toggleTarget.id, !toggleTarget.is_active); setToggleTarget(null); }
    catch { /* future toast */ }
    finally { setToggleLoad(false); }
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold gradient-text">Users</h1>
          <p className="text-xs mt-0.5" style={{ color: "#8b9cb0" }}>{users.length} users in your company</p>
        </div>
        <Link href="/admin/users">
          <Button size="sm" variant="secondary">
            <ExternalLink size={14} /> Manage Users
          </Button>
        </Link>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Agent Type</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell className="text-center py-12" style={{ color: "#8b9cb0" }}>
                  <Users size={32} className="mx-auto mb-2 opacity-30" />No users yet
                </TableCell>
                {Array(6).fill(null).map((_, i) => <TableCell key={i} />)}
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "rgba(48,125,192,0.15)", color: "#78ABD6" }}>
                      {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-white truncate max-w-[120px]">{u.full_name ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell><span className="text-xs" style={{ color: "#9bacc0" }}>{u.email}</span></TableCell>
                <TableCell><Badge variant={u.agent_type} /></TableCell>
                <TableCell><span className="text-xs font-mono" style={{ color: "#8b9cb0" }}>{u.phone ?? "—"}</span></TableCell>
                <TableCell><Badge variant={u.is_active ? "active" : "inactive"} /></TableCell>
                <TableCell><span className="text-xs" style={{ color: "#8b9cb0" }}>{fmt(u.created_at)}</span></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#8b9cb0" }}>
                        <MoreVertical size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => { setEditUser(u); setEditType(u.agent_type); setEditErr(null); }}>
                        <Pencil size={12} /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        destructive={u.is_active}
                        onSelect={() => setToggleTarget(u)}
                      >
                        {u.is_active
                          ? <><UserX size={12} /> Deactivate</>
                          : <><UserCheck size={12} /> Reactivate</>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent title="Edit Agent Type" description={editUser?.email ?? ""}>
          <div className="space-y-4">
            <div>
              <Label>Agent Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as AgentType)}>
                <SelectTrigger placeholder="Select type" />
                <SelectContent>
                  {AGENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editErr && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ED1F24", background: "rgba(237,31,36,0.08)" }}>{editErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit} disabled={editLoad}>{editLoad ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Confirm */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent
          title={toggleTarget?.is_active ? "Deactivate user?" : "Reactivate user?"}
          description={
            toggleTarget?.is_active
              ? `${toggleTarget.full_name ?? toggleTarget.email} will lose access immediately.`
              : `${toggleTarget?.full_name ?? toggleTarget?.email} will regain access.`
          }
          confirmLabel={toggleTarget?.is_active ? "Deactivate" : "Reactivate"}
          confirmVariant={toggleTarget?.is_active ? "destructive" : "primary"}
          onConfirm={handleToggle}
          loading={toggleLoad}
        />
      </AlertDialog>
    </div>
  );
}
