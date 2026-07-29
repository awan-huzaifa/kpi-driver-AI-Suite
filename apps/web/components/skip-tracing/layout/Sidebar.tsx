"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Home, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { C } from "@/components/platform/brand";
import SidebarNavItem from "@/components/ui/sidebar-nav-item";
import type { AccessRole } from "@/types/database";

const NAV_MAIN = [
  { href: "/skip-tracing", icon: Search, label: "Lookup Logs", exact: true },
];

interface Props {
  user:        { email?: string | null; full_name?: string | null };
  accessRole?: AccessRole;
}

export default function Sidebar({ user, accessRole }: Props) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  const initials = (user.full_name ?? user.email ?? "U")[0].toUpperCase();
  const display  = user.full_name ?? user.email?.split("@")[0] ?? "User";

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, bottom: 0,
      width: 248,
      background: `linear-gradient(180deg, rgba(252,175,23,0.05) 0%, ${C.sidebar} 14%, ${C.sidebar} 82%, rgba(67,183,73,0.06) 100%)`,
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      zIndex: 40, overflowY: "auto",
    }}>

      {/* Logo */}
      <div style={{
        padding: "16px 18px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <Image src="/logo3.png" alt="KPI DRIVER" width={80} height={36} style={{ objectFit: "contain", flexShrink: 0 }} priority />
        <p style={{ fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
          <span style={{ color: C.green }}>Built By </span>
          <span style={{ color: C.dimText }}>RE Investors</span>
          <span style={{ color: C.green }}>, For </span>
          <span style={{ color: C.dimText }}>RE Investors</span>
        </p>
      </div>

      {/* Back to main dashboard */}
      <div style={{ padding: "10px 10px 4px", flexShrink: 0 }}>
        <SidebarNavItem href="/dashboard" icon={Home} label="Main Dashboard" pillId="st-pill" exact />
      </div>

      <div style={{ height: 1, background: C.border, margin: "0 10px" }} />

      {/* Main nav */}
      <nav style={{ padding: "10px 10px 4px", flex: 1 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          color: C.blue, textTransform: "uppercase",
          padding: "0 8px", marginBottom: 4,
        }}>Skiptracing</p>

        {NAV_MAIN.map((n) => (
          <SidebarNavItem key={n.href} href={n.href} icon={n.icon} label={n.label} pillId="st-pill" exact={n.exact} />
        ))}
      </nav>

      {/* User card */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.blue, fontSize: 13, fontWeight: 800,
        }}>
          {initials}
        </div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.white, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {display}
            </p>
            {accessRole && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                padding: "2px 6px", borderRadius: 99, flexShrink: 0,
                ...(accessRole === "super_admin"
                  ? { color: "#FCAF17", background: "rgba(252,175,23,0.12)", border: "1px solid rgba(252,175,23,0.25)" }
                  : accessRole === "admin"
                  ? { color: C.blue,    background: "rgba(48,125,192,0.12)",  border: "1px solid rgba(48,125,192,0.25)"  }
                  : { color: C.dimText, background: "rgba(139,156,176,0.08)", border: "1px solid rgba(139,156,176,0.15)" }),
              }}>
                {accessRole === "super_admin" ? "Super Admin" : accessRole === "admin" ? "Admin" : "User"}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, fontWeight: 500, color: C.dimText, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.email}
          </p>
        </div>
        <button
          onClick={signOut}
          title="Sign out"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.dimText, flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.dimText)}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
