"use client";

import { C } from "@/components/platform/brand";
import { Bot } from "lucide-react";

export default function AiAgentsFrame({ src }: { src: string | null }) {
  if (!src) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 16, color: C.dimText,
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(67,183,73,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bot size={26} style={{ color: C.green }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>No company linked</p>
          <p style={{ fontSize: 13, color: C.dimText, margin: 0 }}>
            Your account isn't linked to a company with a GHL sub-account ID.<br />
            Contact your admin to get this set up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header bar matching other apps */}
      <header style={{
        height: 56, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 36px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(9,21,35,0.85)",
        backdropFilter: "blur(12px)",
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.dimText, letterSpacing: "0.06em" }}>
          KPI DRIVER / AI AGENT
        </span>
      </header>

      {/* Full-height iframe */}
      <iframe
        src={src}
        style={{ flex: 1, border: "none", width: "100%", display: "block" }}
        allow="clipboard-write; microphone"
        title="AI Agent"
      />
    </>
  );
}
