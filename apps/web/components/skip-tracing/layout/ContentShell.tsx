"use client";

import { useMotionValue } from "framer-motion";
import { usePathname } from "next/navigation";
import DashboardBg from "@/components/ui/dashboard-bg";
import PageTransition from "@/components/ui/page-transition";
import { C } from "@/components/platform/brand";

const PATH_TITLES: Record<string, string> = {
  "/skip-tracing": "Lookup Logs",
};

export default function ContentShell({ children }: { children: React.ReactNode }) {
  const mouseX   = useMotionValue(0);
  const mouseY   = useMotionValue(0);
  const pathname = usePathname();
  const pageTitle = PATH_TITLES[pathname] ?? "Skip Tracing";

  return (
    <main
      style={{ flex: 1, marginLeft: 248, minHeight: "100vh", position: "relative", overflow: "hidden" }}
      onMouseMove={(e) => {
        const { left, top } = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - left);
        mouseY.set(e.clientY - top);
      }}
    >
      <DashboardBg mouseX={mouseX} mouseY={mouseY} />

      <header style={{
        display: "flex", alignItems: "center",
        padding: "0 36px", height: 56,
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(9,21,35,0.85)",
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 30,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.dimText, letterSpacing: "0.06em" }}>
          KPI DRIVER / SKIP TRACING / {pageTitle.toUpperCase()}
        </span>
      </header>

      <div className="relative z-10 min-h-screen"><PageTransition>{children}</PageTransition></div>
    </main>
  );
}
