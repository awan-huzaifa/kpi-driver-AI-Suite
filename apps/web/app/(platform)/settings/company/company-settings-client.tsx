"use client";

import { useState } from "react";
import { Building2, Wallet, Users, Calendar, Save, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import PlatformShell, { type Access } from "@/components/platform/PlatformShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { SelectInline } from "@/components/ui/select";
import { updateCompany } from "@/app/actions/admin/company";
import LogoUpload from "./logo-upload";
import type { PlanId } from "@kpidriver/auth/types";
import type { AccessRole } from "@/types/database";
import { C } from "@/components/platform/brand";

const TIMEZONE_GROUPS = [
  { label: "US / Canada", options: [
    { value: "America/New_York",    label: "Eastern Time (ET)" },
    { value: "America/Chicago",     label: "Central Time (CT)" },
    { value: "America/Denver",      label: "Mountain Time (MT)" },
    { value: "America/Phoenix",     label: "Arizona (no DST)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Anchorage",   label: "Alaska (AKT)" },
    { value: "Pacific/Honolulu",    label: "Hawaii (HST)" },
  ]},
  { label: "Europe", options: [
    { value: "Europe/London",   label: "London (GMT/BST)" },
    { value: "Europe/Paris",    label: "Paris / Berlin (CET)" },
    { value: "Europe/Helsinki", label: "Helsinki / Athens (EET)" },
    { value: "Europe/Moscow",   label: "Moscow (MSK)" },
  ]},
  { label: "Asia / Pacific", options: [
    { value: "Asia/Dubai",       label: "Dubai (GST)" },
    { value: "Asia/Karachi",     label: "Karachi / Islamabad (PKT)" },
    { value: "Asia/Kolkata",     label: "India (IST)" },
    { value: "Asia/Dhaka",       label: "Dhaka (BST)" },
    { value: "Asia/Bangkok",     label: "Bangkok / Jakarta (ICT)" },
    { value: "Asia/Singapore",   label: "Singapore / KL (SGT)" },
    { value: "Asia/Tokyo",       label: "Tokyo (JST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
    { value: "Pacific/Auckland", label: "Auckland (NZST)" },
  ]},
];

interface Company {
  id:                 string;
  name:               string;
  ghl_sub_account_id: string;
  wallet_balance:     number;
  created_at:         string;
  member_count:       number;
  logo_url:           string | null;
  timezone:           string;
}

interface Props {
  currentUser: { email: string; fullName: string | null };
  planId:      PlanId | null;
  access:      Access;
  accessRole:  AccessRole;
  company:     Company | null;
}

export default function CompanySettingsClient({ currentUser, planId, access, accessRole, company }: Props) {
  const [name, setName]   = useState(company?.name ?? "");
  const [ghlId, setGhlId] = useState(company?.ghl_sub_account_id ?? "");
  const [timezone, setTimezone] = useState(company?.timezone ?? "America/New_York");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) { setErr("Company Name Is Required."); return; }
    setSaving(true); setSaved(false); setErr(null);
    try {
      await updateCompany({ name, ghl_sub_account_id: ghlId, timezone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed To Save.");
    } finally {
      setSaving(false);
    }
  }

  const createdDate = company
    ? new Date(company.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  return (
    <PlatformShell planId={planId} pageTitle="Settings / Company Settings">
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.white, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Company Settings
        </h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: C.bodyText, margin: 0 }}>
          Manage Your Company Profile And Integration Settings.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

        {/* ── Left: editable form ── */}
        <div style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(48,125,192,0.12)",
              border: "1px solid rgba(48,125,192,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Building2 size={16} style={{ color: C.blue }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>General</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: C.dimText, margin: 0 }}>Basic Company Information</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Acquisitions"
              />
            </div>

            <div>
              <Label htmlFor="ghl-id">GHL Sub-Account ID</Label>
              <Input
                id="ghl-id"
                value={ghlId}
                onChange={(e) => setGhlId(e.target.value)}
                placeholder="abc123xyz"
              />
              <p style={{ fontSize: 12, fontWeight: 500, color: C.dimText, marginTop: 6 }}>
                Found In Your GoHighLevel Sub-Account URL. Used To Route Incoming Calls To This Company.
              </p>
            </div>

            <div>
              <Label htmlFor="company-tz">Report Timezone</Label>
              <div style={{ marginTop: 6 }}>
                <SelectInline
                  value={timezone}
                  onValueChange={setTimezone}
                  placeholder="Select Timezone"
                  groups={TIMEZONE_GROUPS}
                />
              </div>
              <p style={{ fontSize: 12, fontWeight: 500, color: C.dimText, marginTop: 6 }}>
                Automated Email Reports Are Sent At 8 AM In This Timezone.
              </p>
            </div>

            {company && (
              <div style={{ paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
                <LogoUpload companyId={company.id} currentLogoUrl={company.logo_url} />
              </div>
            )}
          </div>

          {err && (
            <p style={{
              fontSize: 12, fontWeight: 500, marginTop: 16,
              color: C.red, background: "rgba(237,31,36,0.08)",
              padding: "8px 12px", borderRadius: 8,
            }}>
              {err}
            </p>
          )}

          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={13} style={{ marginRight: 6 }} />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
            {saved && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.green }}>
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
          </div>
        </div>

        {/* ── Right: stats ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <StatCard
            icon={Wallet}
            label="Wallet Balance"
            value={company != null ? `$${(company.wallet_balance ?? 0).toFixed(2)}` : "—"}
            sub={<Link href="/billing" style={{ fontSize: 11, fontWeight: 600, color: C.blue, textDecoration: "none" }}>Manage In Billing →</Link>}
          />

          <StatCard
            icon={Users}
            label="Active Members"
            value={company?.member_count.toString() ?? "—"}
            sub={<Link href="/admin/users" style={{ fontSize: 11, fontWeight: 600, color: C.blue, textDecoration: "none" }}>Manage Users →</Link>}
          />

          <StatCard
            icon={Calendar}
            label="Company Created"
            value={createdDate}
          />
        </div>
      </div>
    </PlatformShell>
  );
}

function StatCard({
  icon: Icon, label, value, sub,
}: {
  icon: React.ElementType; label: string; value: string; sub?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "16px 18px",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: "rgba(48,125,192,0.10)",
        border: "1px solid rgba(48,125,192,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={15} style={{ color: C.blue }} />
      </div>
      <div style={{ overflow: "hidden" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.dimText, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </p>
        <p style={{ fontSize: 18, fontWeight: 800, color: C.white, margin: 0, letterSpacing: "-0.01em" }}>
          {value}
        </p>
        {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}
