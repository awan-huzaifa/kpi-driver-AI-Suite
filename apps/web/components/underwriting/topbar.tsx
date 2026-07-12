"use client";

import { usePathname } from "next/navigation";
import { C } from "@/components/platform/brand";

const pageTitles: Record<string, string> = {
  "/underwriting":           "Dashboard",
  "/underwriting/deals":     "Deals",
  "/underwriting/analytics": "Analytics",
  "/underwriting/settings":  "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const title    = pageTitles[pathname] ?? "Dashboard";

  return (
    <header style={{
      display: "flex", alignItems: "center",
      padding: "0 36px", height: 56, flexShrink: 0,
      borderBottom: `1px solid ${C.border}`,
      background: "rgba(9,21,35,0.85)",
      backdropFilter: "blur(12px)",
      position: "sticky", top: 0, zIndex: 30,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.dimText, letterSpacing: "0.06em" }}>
        KPI DRIVER / DEAL UW / {title.toUpperCase()}
      </span>
    </header>
  );
}
