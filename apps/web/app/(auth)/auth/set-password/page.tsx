"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [agreed,   setAgreed]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) { setReady(true); return; }

    const params  = new URLSearchParams(hash);
    const access  = params.get("access_token");
    const refresh = params.get("refresh_token");

    if (access && refresh) {
      createClient().auth
        .setSession({ access_token: access, refresh_token: refresh })
        .then(({ error: e }) => {
          if (e) setError("Invalid or expired invite link. Ask your admin to resend the invite.");
          else setReady(true);
        });
    } else {
      setReady(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    if (!agreed) { setError("Please agree to the Terms & Conditions and Privacy Policy to continue."); return; }

    setLoading(true);
    setError(null);

    const { error } = await createClient().auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (!ready) return (
    <div style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", background: "#0d1b2e" }}>
      <Loader2 size={24} style={{ color: "#307DC0", animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ height: "100dvh", display: "flex", overflow: "hidden", background: "#0d1b2e" }}>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "32px 24px 80px", zIndex: 10,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          {/* Logo */}
          <Image src="/logo3.png" alt="KPI DRIVER" width={210} height={77} style={{ objectFit: "contain" }} priority />

          {/* Tagline */}
          <p style={{ fontSize: 11, fontWeight: 600, margin: "8px 0 28px", lineHeight: 1.5, textAlign: "center" }}>
            <span style={{ color: "#22c55e" }}>Built By </span>
            <span style={{ color: "#64748b" }}>RE Investors</span>
            <span style={{ color: "#22c55e" }}> For </span>
            <span style={{ color: "#64748b" }}>RE Investors</span>
          </p>

          {/* Card */}
          <div style={{
            width: "100%",
            background:           "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
            backdropFilter:       "blur(52px) saturate(180%) brightness(1.08)",
            WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.08)",
            border:               "1px solid rgba(255,255,255,0.18)",
            borderRadius:         24,
            padding:              "36px 32px",
            boxShadow:            "inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 48px rgba(0,0,0,0.3)",
          }}>
            {/* Lock icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: "linear-gradient(135deg, #307DC0 0%, #43B749 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 24px rgba(48,125,192,0.3)",
              }}>
                <Lock size={22} style={{ color: "#fff" }} />
              </div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", marginBottom: 4, textAlign: "center" }}>
              Set Your Password
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 28, textAlign: "center" }}>
              Choose A Password To Complete Your Account Setup
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* New Password */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#334155", pointerEvents: "none" }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="input-dark"
                    style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#334155", pointerEvents: "none" }} />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="input-dark"
                    style={{ width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Terms & Conditions checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "#307DC0", width: 14, height: 14, flexShrink: 0, cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  I Agree To The{' '}
                  <a href="/terms-and-conditions" target="_blank" style={{ color: "#307DC0", fontWeight: 600, textDecoration: "none" }}>Terms & Conditions</a>
                  {' '}And{' '}
                  <a href="/privacy_policy" target="_blank" style={{ color: "#307DC0", fontWeight: 600, textDecoration: "none" }}>Privacy Policy</a>
                </span>
              </label>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px", borderRadius: 12, fontSize: 12,
                    background: "rgba(237,31,36,0.08)",
                    border: "1px solid rgba(237,31,36,0.2)",
                    color: "#f87171",
                  }}
                >
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", padding: "10px 0", borderRadius: 12, marginTop: 4,
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  background: "linear-gradient(135deg, #307DC0 0%, #43B749 100%)",
                  border: "none",
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 0 24px rgba(48,125,192,0.25)",
                  transition: "opacity 0.2s",
                }}
              >
                {loading
                  ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  : <><span>Set Password</span><ArrowRight size={14} /></>
                }
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Footer — same as login page */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        style={{
          position: "absolute", bottom: 16, left: 0, right: 0,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          zIndex: 20,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>
          KPI DRIVER · Built By RE Investors For RE Investors
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="#"
            style={{ fontSize: 11, fontWeight: 600, color: "#475569", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
            onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
          >
            Terms & Conditions
          </a>
          <span style={{ color: "#2d3f52", fontSize: 11 }}>·</span>
          <a
            href="#"
            style={{ fontSize: 11, fontWeight: 600, color: "#475569", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
            onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
          >
            Privacy Policy
          </a>
        </div>
      </motion.div>
    </div>
  );
}
