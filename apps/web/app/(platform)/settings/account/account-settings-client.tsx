"use client";

import { useRef, useState } from "react";
import { User, Lock, CheckCircle2, Save, Mail, Camera, Loader2 } from "lucide-react";
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
  currentUser: { id: string; email: string; fullName: string | null; avatarUrl: string | null };
  planId:      PlanId | null;
  access:      Access;
  accessRole:  AccessRole;
}

export default function AccountSettingsClient({ currentUser, planId, access, accessRole }: Props) {
  const initials = (currentUser.fullName ?? currentUser.email)[0]?.toUpperCase() ?? "U";

  /* ── Avatar state ── */
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl,      setAvatarUrl]      = useState<string | null>(currentUser.avatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarErr,       setAvatarErr]       = useState<string | null>(null);

  /* ── Profile state ── */
  const [fullName,      setFullName]      = useState(currentUser.fullName ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [profileErr,    setProfileErr]    = useState<string | null>(null);

  /* ── Password state ── */
  const [newPass,    setNewPass]    = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [passSaving, setPassSaving] = useState(false);
  const [passSaved,  setPassSaved]  = useState(false);
  const [passErr,    setPassErr]    = useState<string | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setAvatarErr("Image Must Be Under 5 MB."); return; }

    setAvatarUploading(true); setAvatarErr(null);
    try {
      const supabase  = createClient();
      const ext       = file.name.split(".").pop() ?? "jpg";
      const path      = `${currentUser.id}/avatar.${ext}`;
      // upsert so re-uploads replace the existing file
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      // Bust cache by appending a timestamp
      const bustedUrl = `${publicUrl}?t=${Date.now()}`;
      await updateProfile({ avatar_url: publicUrl });
      setAvatarUrl(bustedUrl);
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { url: bustedUrl } }));
    } catch (err) {
      setAvatarErr(err instanceof Error ? err.message : "Upload Failed.");
    } finally {
      setAvatarUploading(false);
      // Reset input so the same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleProfileSave() {
    setProfileSaving(true); setProfileSaved(false); setProfileErr(null);
    try {
      await updateProfile({ full_name: fullName });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : "Failed To Save.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave() {
    if (newPass.length < 8) { setPassErr("Password Must Be At Least 8 Characters."); return; }
    if (newPass !== confirm) { setPassErr("Passwords Do Not Match."); return; }
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
    <PlatformShell planId={planId} pageTitle="Settings / Account Settings">
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.white, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Account Settings
        </h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: C.bodyText, margin: 0 }}>
          Manage Your Personal Profile And Password.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>

        {/* ── Profile card ── */}
        <Card icon={User} title="Profile" subtitle="Your Personal Information">
          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
            {/* Avatar circle */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                overflow: "hidden",
                background: "rgba(48,125,192,0.15)",
                border: "1px solid rgba(48,125,192,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 28, fontWeight: 800, color: C.blue }}>{initials}</span>
                )}
              </div>
              {/* Camera overlay button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                title="Change avatar"
                style={{
                  position: "absolute", bottom: -6, right: -6,
                  width: 26, height: 26, borderRadius: 8,
                  background: C.blue, border: "2px solid #0D1C2A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: avatarUploading ? "wait" : "pointer",
                }}
              >
                {avatarUploading
                  ? <Loader2 size={12} style={{ color: "#fff", animation: "spin 1s linear infinite" }} />
                  : <Camera size={12} style={{ color: "#fff" }} />}
              </button>
            </div>

            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: "0 0 4px" }}>
                Profile Picture
              </p>
              <p style={{ fontSize: 12, fontWeight: 500, color: C.dimText, margin: "0 0 10px" }}>
                JPG, PNG or WebP · max 5 MB
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                style={{
                  fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8,
                  background: "rgba(48,125,192,0.12)", border: "1px solid rgba(48,125,192,0.25)",
                  color: C.blue, cursor: avatarUploading ? "wait" : "pointer",
                }}
              >
                {avatarUploading ? "Uploading…" : avatarUrl ? "Change Photo" : "Upload Photo"}
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </div>

          {avatarErr && <ErrorMsg>{avatarErr}</ErrorMsg>}

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
                Email Cannot Be Changed. Contact Your Admin If Needed.
              </p>
            </div>
          </div>

          {profileErr && <ErrorMsg>{profileErr}</ErrorMsg>}
          <SaveRow saving={profileSaving} saved={profileSaved} onSave={handleProfileSave} />
        </Card>

        {/* ── Password card ── */}
        <Card icon={Lock} title="Password" subtitle="Change Your Login Password">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Label htmlFor="new-pass">New Password</Label>
              <Input
                id="new-pass"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Min. 8 Characters"
              />
            </div>
            <div>
              <Label htmlFor="confirm-pass">Confirm Password</Label>
              <Input
                id="confirm-pass"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat Password"
              />
            </div>
          </div>

          {passErr && <ErrorMsg>{passErr}</ErrorMsg>}
          <SaveRow saving={passSaving} saved={passSaved} onSave={handlePasswordSave} label="Update Password" />
        </Card>

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
