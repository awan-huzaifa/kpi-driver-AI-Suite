"use client";

import { useState } from "react";
import { Bell, Lock, FileText, CreditCard } from "lucide-react";
import PlatformShell, { type Access } from "@/components/platform/PlatformShell";
import { updateMyNotifications } from "@/app/actions/admin/notifications";
import type { PlanId } from "@kpidriver/auth/types";
import { C } from "@/components/platform/brand";

interface Props {
  currentUser:         { email: string; fullName: string | null };
  planId:              PlanId | null;
  accessRole:          string;
  access:              Access;
  notifyReports:       boolean;
  notifyBilling:       boolean;
  notifyReportsLocked: boolean;
  notifyBillingLocked: boolean;
}

function NotifToggle({
  icon: Icon,
  title,
  description,
  enabled,
  locked,
  onToggle,
  saving,
}: {
  icon:        React.ElementType;
  title:       string;
  description: string;
  enabled:     boolean;
  locked:      boolean;
  onToggle:    () => void;
  saving:      boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "20px 24px",
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${enabled ? "rgba(48,125,192,0.2)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 14,
      opacity: locked ? 0.7 : 1,
    }}>
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
        background: enabled ? "rgba(48,125,192,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${enabled ? "rgba(48,125,192,0.2)" : "rgba(255,255,255,0.07)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} style={{ color: enabled ? C.blue : C.dimText }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0 }}>{title}</p>
          {locked && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: 700,
              color: "#FCAF17", background: "rgba(252,175,23,0.1)",
              border: "1px solid rgba(252,175,23,0.2)",
              padding: "2px 7px", borderRadius: 99,
            }}>
              <Lock size={9} />
              Managed by Administrator
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, fontWeight: 500, color: C.dimText, margin: 0 }}>
          {description}
        </p>
      </div>

      {/* Toggle */}
      <button
        type="button"
        disabled={locked || saving}
        onClick={onToggle}
        title={locked ? "This setting is controlled by your administrator" : undefined}
        style={{
          width: 44, height: 24, borderRadius: 12, flexShrink: 0,
          background: enabled ? C.blue : "rgba(255,255,255,0.1)",
          border: "none", cursor: locked ? "not-allowed" : "pointer",
          position: "relative", transition: "background 0.2s",
          padding: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 3,
          left: enabled ? 23 : 3,
          width: 18, height: 18, borderRadius: "50%",
          background: "#ffffff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}

export default function NotificationsClient({
  planId, accessRole, access,
  notifyReports, notifyBilling, notifyReportsLocked, notifyBillingLocked,
}: Props) {
  const [reports, setReports]   = useState(notifyReports);
  const [billing, setBilling]   = useState(notifyBilling);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);

  async function toggle(field: "reports" | "billing") {
    setSaving(true); setSaved(false);
    try {
      if (field === "reports") {
        const next = !reports;
        await updateMyNotifications({ notify_reports: next });
        setReports(next);
      } else {
        const next = !billing;
        await updateMyNotifications({ notify_billing: next });
        setBilling(next);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PlatformShell planId={planId} pageTitle="Settings / Notifications">
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: "rgba(48,125,192,0.12)", border: "1px solid rgba(48,125,192,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Bell size={18} style={{ color: C.blue }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: C.white, letterSpacing: "-0.02em", margin: 0 }}>
              Notification Preferences
            </h1>
            <p style={{ fontSize: 13, fontWeight: 500, color: C.dimText, margin: 0 }}>
              Control Which Emails You Receive From KPI Driver.
            </p>
          </div>
        </div>
        {saved && (
          <p style={{
            fontSize: 12, fontWeight: 600, color: C.green,
            background: "rgba(67,183,73,0.08)", border: "1px solid rgba(67,183,73,0.15)",
            padding: "8px 14px", borderRadius: 8, display: "inline-block", marginTop: 8,
          }}>
            Preferences Saved.
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 660 }}>
        <NotifToggle
          icon={FileText}
          title="Report Emails"
          description="Receive Periodic Performance Reports — Sales Coach, Training Coach, And Underwriting Summaries Sent At 8 AM In Your Company Timezone."
          enabled={reports}
          locked={notifyReportsLocked}
          onToggle={() => toggle("reports")}
          saving={saving}
        />
        <NotifToggle
          icon={CreditCard}
          title="Billing Notifications"
          description="Receive An Email Whenever Your Company Wallet Is Topped Up, Including The Amount Added And Your New Balance."
          enabled={billing}
          locked={notifyBillingLocked}
          onToggle={() => toggle("billing")}
          saving={saving}
        />
      </div>

      {(notifyReportsLocked || notifyBillingLocked) && (
        <p style={{
          fontSize: 12, fontWeight: 500, color: C.dimText,
          marginTop: 20,
        }}>
          Settings Marked With <span style={{ color: "#FCAF17", fontWeight: 700 }}>Managed By Administrator</span> Have Been Configured By Your Super Admin And Cannot Be Changed Here. Contact Your Administrator To Update Them.
        </p>
      )}
    </PlatformShell>
  );
}
