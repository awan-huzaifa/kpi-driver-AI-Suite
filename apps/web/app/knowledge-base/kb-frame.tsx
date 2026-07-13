"use client";

import { C } from "@/components/platform/brand";

const KB_URL = "https://www.kpidriver.com/knowledge-base";

export default function KnowledgeBaseFrame() {
  return (
    <>
      <header style={{
        height: 56, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 36px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(9,21,35,0.85)",
        backdropFilter: "blur(12px)",
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.dimText, letterSpacing: "0.06em" }}>
          KPI DRIVER / KNOWLEDGE BASE
        </span>
      </header>

      <iframe
        src={KB_URL}
        style={{ flex: 1, border: "none", width: "100%", display: "block" }}
        allow="clipboard-write"
        title="Knowledge Base"
      />
    </>
  );
}
