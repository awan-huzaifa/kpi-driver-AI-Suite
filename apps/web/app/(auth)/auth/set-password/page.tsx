"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import ParticlesBg from "@/components/ui/particles-bg";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
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
      <ParticlesBg />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "32px 24px", zIndex: 10,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ width: "100%", maxWidth: 380 }}
        >
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <Image src="/logo.png" alt="KPI DRIVER" width={120} height={44} style={{ objectFit: "contain" }} priority />
          </div>

          {/* Card */}
          <div style={{
            background:           "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
            backdropFilter:       "blur(52px) saturate(180%) brightness(1.08)",
            WebkitBackdropFilter: "blur(52px) saturate(180%) brightness(1.08)",
            border:               "1px solid rgba(255,255,255,0.18)",
            borderRadius:         24,
            padding:              "36px 32px",
            boxShadow:            "inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 48px rgba(0,0,0,0.3)",
          }}>
            {/* Icon */}
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
              Set your password
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 28, textAlign: "center" }}>
              Choose a password to complete your account setup
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

          <p style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "#475569", marginTop: 16 }}>
            Built By RE Investors, For RE Investors
          </p>
        </motion.div>
      </div>
    </div>
  );
}
