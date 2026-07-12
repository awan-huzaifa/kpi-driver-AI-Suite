"use client";

import { useState } from "react";
import { User, Lock, Mail, Phone, Bell, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfile, updatePassword, updateDigestPreferences } from "@/app/actions/sales-coach/settings";
import type { AccessRole } from "@/types/database";

interface Props {
  email:              string;
  fullName:           string;
  phone:              string;
  accessRole:         AccessRole;
  digestPreferences:  { enabled: boolean; periods: string[] };
}

const DIGEST_PERIODS = [
  { value: "daily",     label: "Daily"     },
  { value: "weekly",    label: "Weekly"    },
  { value: "monthly",   label: "Monthly"   },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly",    label: "Yearly"    },
];

function Section({ icon: Icon, title, description, children }: {
  icon:        React.ElementType;
  title:       string;
  description: string;
  children:    React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-8 py-8" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      {/* Left — label */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(48,125,192,0.12)" }}>
            <Icon size={15} style={{ color: "#78ABD6" }} />
          </div>
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{description}</p>
      </div>

      {/* Right — form */}
      <div className="col-span-2 glass rounded-2xl px-6 py-6">
        {children}
      </div>
    </div>
  );
}

function SaveFeedback({ status }: { status: "idle" | "saving" | "saved" | "error"; error?: string }) {
  if (status === "idle")   return null;
  if (status === "saving") return <span className="text-xs" style={{ color: "#475569" }}>Saving…</span>;
  if (status === "saved")  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: "#43B749" }}>
      <Check size={12} /> Saved
    </span>
  );
  return <span className="text-xs" style={{ color: "#ED1F24" }}>{error}</span>;
}

export default function SettingsClient({ email, fullName, phone, accessRole, digestPreferences }: Props) {
  // ── Profile ─────────────────────────────────────────────────────────────────
  const [name,      setName]      = useState(fullName);
  const [phoneVal,  setPhoneVal]  = useState(phone);
  const [profStatus, setProfStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [profErr,   setProfErr]   = useState("");

  async function handleProfileSave() {
    setProfStatus("saving"); setProfErr("");
    try {
      await updateProfile({ full_name: name, phone: phoneVal });
      setProfStatus("saved");
      setTimeout(() => setProfStatus("idle"), 3000);
    } catch (e) {
      setProfErr(e instanceof Error ? e.message : "Failed to save.");
      setProfStatus("error");
    }
  }

  // ── Password ─────────────────────────────────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [pwStatus,   setPwStatus]   = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [pwErr,      setPwErr]      = useState("");

  async function handlePasswordSave() {
    if (newPw.length < 8)       { setPwErr("New password must be at least 8 characters."); setPwStatus("error"); return; }
    if (newPw !== confirmPw)    { setPwErr("Passwords do not match."); setPwStatus("error"); return; }
    setPwStatus("saving"); setPwErr("");
    try {
      await updatePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwStatus("saved");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwStatus("idle"), 3000);
    } catch (e) {
      setPwErr(e instanceof Error ? e.message : "Failed to update password.");
      setPwStatus("error");
    }
  }

  // ── Digest preferences ───────────────────────────────────────────────────────
  const [digestEnabled, setDigestEnabled] = useState(digestPreferences.enabled ?? true);
  const [digestPeriods, setDigestPeriods] = useState<string[]>(digestPreferences.periods ?? ["weekly"]);
  const [digestStatus,  setDigestStatus]  = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [digestErr,     setDigestErr]     = useState("");

  function togglePeriod(p: string) {
    setDigestPeriods((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleDigestSave() {
    setDigestStatus("saving"); setDigestErr("");
    try {
      await updateDigestPreferences({ enabled: digestEnabled, periods: digestPeriods });
      setDigestStatus("saved");
      setTimeout(() => setDigestStatus("idle"), 3000);
    } catch (e) {
      setDigestErr(e instanceof Error ? e.message : "Failed to save.");
      setDigestStatus("error");
    }
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-2">
        <h1 className="text-xl font-bold gradient-text">Settings</h1>
        <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Manage your account preferences</p>
      </div>

      {/* ── Profile ── */}
      <Section icon={User} title="Profile" description={accessRole === "super_admin" ? "Your display name shown across the platform." : "Your display name and phone number. Phone must match the number your calls come from — it's how calls get linked to your account."}>
        <div className="space-y-4">
          {/* Email — read only */}
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#334155" }} />
              <input
                id="email"
                value={email}
                readOnly
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none cursor-not-allowed"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border:     "1px solid rgba(255,255,255,0.06)",
                  color:      "#475569",
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: "#334155" }}>Email cannot be changed here.</p>
          </div>

          <div>
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {accessRole !== "super_admin" && (
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#334155" }} />
                <input
                  id="phone"
                  placeholder="+1 555 000 0000"
                  value={phoneVal}
                  onChange={(e) => setPhoneVal(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border:     "1px solid rgba(255,255,255,0.08)",
                    color:      "#f1f5f9",
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <SaveFeedback status={profStatus} error={profErr} />
            <Button size="sm" onClick={handleProfileSave} disabled={profStatus === "saving"}>
              {profStatus === "saving" ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </div>
      </Section>

      {/* ── Password ── */}
      <Section icon={Lock} title="Password" description="Update your login password. You'll need to enter your current password to confirm the change.">
        <div className="space-y-4">
          <div>
            <Label htmlFor="current-pw">Current Password</Label>
            <Input
              id="current-pw"
              type="password"
              placeholder="••••••••"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-pw">New Password</Label>
            <Input
              id="new-pw"
              type="password"
              placeholder="••••••••"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <p className="text-xs mt-1" style={{ color: "#334155" }}>Minimum 8 characters.</p>
          </div>
          <div>
            <Label htmlFor="confirm-pw">Confirm New Password</Label>
            <Input
              id="confirm-pw"
              type="password"
              placeholder="••••••••"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <SaveFeedback status={pwStatus} error={pwErr} />
            <Button size="sm" onClick={handlePasswordSave} disabled={pwStatus === "saving" || !currentPw || !newPw || !confirmPw}>
              {pwStatus === "saving" ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </div>
      </Section>

      {/* ── Digest Preferences — admin only ── */}
      {accessRole === "admin" && (
        <Section icon={Bell} title="Email Digests" description="Choose which performance report emails you receive and how often.">
          <div className="space-y-5">
            {/* Enabled toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Enable digest emails</p>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Receive automated performance summaries</p>
              </div>
              <button
                onClick={() => setDigestEnabled((v) => !v)}
                className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                style={{ background: digestEnabled ? "rgba(48,125,192,0.6)" : "rgba(255,255,255,0.08)" }}>
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: digestEnabled ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>

            {/* Period checkboxes */}
            {digestEnabled && (
              <div>
                <p className="text-xs font-medium mb-3" style={{ color: "#475569" }}>Digest frequency</p>
                <div className="space-y-2">
                  {DIGEST_PERIODS.map((p) => {
                    const checked = digestPeriods.includes(p.value);
                    return (
                      <label key={p.value}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                        style={{
                          background: checked ? "rgba(48,125,192,0.07)" : "rgba(255,255,255,0.02)",
                          border:     `1px solid ${checked ? "rgba(48,125,192,0.2)" : "rgba(255,255,255,0.05)"}`,
                        }}>
                        <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{
                            background: checked ? "#307DC0" : "transparent",
                            border:     checked ? "none" : "1px solid rgba(255,255,255,0.15)",
                          }}>
                          {checked && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-sm" style={{ color: checked ? "#e2e8f0" : "#64748b" }}>{p.label}</span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => togglePeriod(p.value)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <SaveFeedback status={digestStatus} error={digestErr} />
              <Button size="sm" onClick={handleDigestSave} disabled={digestStatus === "saving"}>
                {digestStatus === "saving" ? "Saving…" : "Save Preferences"}
              </Button>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
