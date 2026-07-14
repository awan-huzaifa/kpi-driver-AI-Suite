"use client";

import { useState } from "react";
import { User, Lock, CheckCircle2, Save, Mail } from "lucide-react";
import PlatformShell, { type Access } from "@/components/platform/PlatformShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/actions/account";
import { createClient } from "@/lib/supabase/client";
import type { PlanId } from "@kpidriver/auth/types";
import type { AccessRole } from "@/types/database";
import { C } from "@/components/platform/brand";

interface Props {
  currentUser: { id: string; email: string; fullName: string | null };
  planId:      PlanId | null;
  access:      Access;
  accessRole:  AccessRole;
}

export default function AccountSettingsClient({ currentUser, planId, access, accessRole }: Props) {
  /* ── Profile state ── */
  const [fullName, setFullName] = useState(currentUser.fullName ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [profileErr,    setProfileErr]    = useState<string | null>(null);

  /* ── Password state ── */
  const [newPass,  setNewPass]  = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [passSaving, setPassSaving] = useState(false);
  const [passSaved,  setPassSaved]  = useState(false);
  const [passErr,    setPassErr]    = useState<string | null>(null);

  async function handleProfileSave() {
    setProfileSaving(true); setProfileSaved(false); setProfileErr(null);
    try {
      await updateProfile({ full_name: fullName });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave() {
    if (newPass.length < 8)      { setPassErr("Password must be at least 8 characters."); return; }
    if (newPass !== confirm)      { setPassErr("Passwords do not match."); return; }
    setPassSaving(true); setPassSaved(false); setPassErr(null);
    const { error } = await createClient().auth.updateUser({ password: newPass });
    if (error) {
      setPassErr(error.message);
    } else {
      setPassSaved(true);
      setNewPass(""); setConfirm("");
      setTimeout(() => setPassSaved(false), 3000);
    }
    setPassSaving(false);
  }

  return (
    <PlatformShell
      user={{ email: currentUser.email, fullName: currentUser.fullName }}
      planId={planId}
      access={access}
      accessRole={accessRole}
      pageTitle="Account Settings"
    >
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.white, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Account Settings
        </h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: C.bodyText, margin: 0 }}>
          Manage your personal profile and password.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>

        {/* ── Profile card ── */}
        <Card icon={User} title="Profile" subtitle="Your personal information">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  color: C.dimText, pointerEvents: "none",
                }} />
                <Input
                  id="email"
                  value={currentUser.email}
                  readOnly
                  style={{ paddingLeft: 34, opacity: 0.5, cursor: "not-allowed" }}
                />
              </div>
              <p style={{ fontSize: 11, fontWeight: 500, color: C.dimText, marginTop: 5 }}>
                Email cannot be changed. Contact your admin if needed.
              </p>
            </div>

          </div>

          {profileErr && <ErrorMsg>{profileErr}</ErrorMsg>}

          <SaveRow saving={profileSaving} saved={profileSaved} onSave={handleProfileSave} />
        </Card>

        {/* ── Password card ── */}
        <Card icon={Lock} title="Password" subtitle="Change your login password">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Label htmlFor="new-pass">New Password</Label>
              <Input
                id="new-pass"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirm-pass">Confirm Password</Label>
              <Input
                id="confirm-pass"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
              />
            </div>
          </div>

          {passErr && <ErrorMsg>{passErr}</ErrorMsg>}

          <SaveRow saving={passSaving} saved={passSaved} onSave={handlePasswordSave} label="Update Password" />
        </Card>

      </div>
    </PlatformShell>
  );
}

/* ── Sub-components ── */

function Card({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: 28,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "rgba(48,125,192,0.12)",
          border: "1px solid rgba(48,125,192,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} style={{ color: C.blue }} />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.dimText, margin: 0 }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SaveRow({ saving, saved, onSave, label = "Save Changes" }: {
  saving: boolean; saved: boolean; onSave: () => void; label?: string;
}) {
  return (
    <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
      <Button size="sm" onClick={onSave} disabled={saving}>
        <Save size={13} style={{ marginRight: 6 }} />
        {saving ? "Saving…" : label}
      </Button>
      {saved && (
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.green }}>
          <CheckCircle2 size={14} /> Saved
        </span>
      )}
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 12, fontWeight: 500, marginTop: 14,
      color: C.red, background: "rgba(237,31,36,0.08)",
      padding: "8px 12px", borderRadius: 8,
    }}>
      {children}
    </p>
  );
}
