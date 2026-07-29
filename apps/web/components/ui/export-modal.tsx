"use client";

import { useState, useCallback } from "react";
import { Download, X, Check, Calendar } from "lucide-react";
import { CalendarPopup, fmtDisplay } from "@/components/ui/date-range-picker";

export type ColDef<T = Record<string, unknown>> = {
  label:    string;
  getValue: (row: T) => string | number | null | undefined;
};

interface Props<T extends Record<string, unknown>> {
  onClose:          () => void;
  data:             T[];
  dateField?:       string;
  defaultCols:      ColDef<T>[];
  extraCols?:       ColDef<T>[];
  filenamePrefix:   string;
  onServerExport?:  (cols: string[], fromDate: string, toDate: string) => void;
}

function escCSV(v: string | number | null | undefined): string {
  if (v == null || v === "") return "";
  return `"${String(v).replace(/"/g, '""')}"`;
}

function ColCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
        background: checked ? "rgba(48,125,192,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${checked ? "rgba(48,125,192,0.2)" : "rgba(255,255,255,0.05)"}`,
        transition: "all 0.12s", width: "100%",
      }}
    >
      <div style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0,
        background: checked ? "#307DC0" : "rgba(255,255,255,0.06)",
        border: `1px solid ${checked ? "#307DC0" : "rgba(255,255,255,0.1)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <Check size={9} style={{ color: "#fff" }} />}
      </div>
      <span style={{ fontSize: 11, color: checked ? "#e2e8f0" : "#64748b", fontWeight: checked ? 600 : 400, lineHeight: 1.3 }}>
        {label}
      </span>
    </button>
  );
}

/* ── Date field (matches DateRangePicker's DateField style) ────── */

function ExportDateField({
  label, value, otherValue, onChange,
}: { label: string; value: string; otherValue: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const isFrom = label === "From";
  const from = isFrom ? value : otherValue;
  const to   = isFrom ? otherValue : value;

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", flexDirection: "column", gap: 3, cursor: "pointer" }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
          color: value ? "#e2e8f0" : "#475569",
        }}>
          {fmtDisplay(value)}
        </span>
      </div>

      {open && (
        <CalendarPopup
          value={value}
          from={from}
          to={to}
          onSelect={onChange}
          onClose={close}
          compact
        />
      )}
    </div>
  );
}

export function ExportModal<T extends Record<string, unknown>>({
  onClose, data, dateField = "created_at",
  defaultCols, extraCols = [], filenamePrefix,
  onServerExport,
}: Props<T>) {
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");
  const [checked,  setChecked]  = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    defaultCols.forEach(c => { init[c.label] = true; });
    extraCols.forEach(c => { init[c.label] = false; });
    return init;
  });

  const allCols = [...defaultCols, ...extraCols];
  const selectedCols = allCols.filter(c => checked[c.label] ?? defaultCols.some(d => d.label === c.label));

  function toggle(label: string) {
    setChecked(prev => ({ ...prev, [label]: !prev[label] }));
  }

  function handleExport() {
    if (onServerExport) {
      onServerExport(selectedCols.map(c => c.label), fromDate, toDate);
      onClose();
      return;
    }

    let rows = data;
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      rows = rows.filter(r => new Date(r[dateField] as string) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter(r => new Date(r[dateField] as string) <= to);
    }

    const header = selectedCols.map(c => escCSV(c.label)).join(",");
    const lines  = rows.map(r => selectedCols.map(c => escCSV(c.getValue(r))).join(","));
    const csv    = [header, ...lines].join("\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  const exportCount = fromDate || toDate
    ? data.filter(r => {
        const d = new Date(r[dateField] as string);
        if (fromDate) { const f = new Date(fromDate); f.setHours(0,0,0,0); if (d < f) return false; }
        if (toDate)   { const t = new Date(toDate);   t.setHours(23,59,59,999); if (d > t) return false; }
        return true;
      }).length
    : data.length;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 24px 24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 540,
          background: "#0b1829",
          border: "1px solid rgba(48,125,192,0.2)",
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "18px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(48,125,192,0.07) 0%, transparent 100%)",
          borderRadius: "20px 20px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: "rgba(48,125,192,0.15)", border: "1px solid rgba(48,125,192,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Download size={14} style={{ color: "#307DC0" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Export as CSV</p>
              <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>{onServerExport ? "All matching rows" : `${exportCount} rows`} · {selectedCols.length} columns</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Date Range */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
              Date Range (optional)
            </p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(48,125,192,0.06)",
              border: "1px solid rgba(48,125,192,0.2)",
            }}>
              <Calendar size={13} style={{ color: "#307DC0", flexShrink: 0 }} />

              <ExportDateField
                label="From"
                value={fromDate}
                otherValue={toDate}
                onChange={setFromDate}
              />

              <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

              <ExportDateField
                label="To"
                value={toDate}
                otherValue={fromDate}
                onChange={setToDate}
              />

              {(fromDate || toDate) && (
                <button
                  onClick={() => { setFromDate(""); setToDate(""); }}
                  style={{
                    padding: "4px 10px", flexShrink: 0,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 7, color: "#64748b", fontSize: 11, cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Columns */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Columns</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setChecked(prev => { const n = { ...prev }; allCols.forEach(c => { n[c.label] = true; }); return n; })}
                  style={{ fontSize: 11, color: "#307DC0", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Select All
                </button>
                <span style={{ color: "#1e293b" }}>·</span>
                <button
                  onClick={() => setChecked(prev => { const n = { ...prev }; allCols.forEach(c => { n[c.label] = false; }); return n; })}
                  style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {defaultCols.length > 0 && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px 2px" }}>Default Columns</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {defaultCols.map(c => (
                      <ColCheckbox key={c.label} label={c.label} checked={checked[c.label] ?? true} onChange={() => toggle(c.label)} />
                    ))}
                  </div>
                </div>
              )}
              {extraCols.length > 0 && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px 2px" }}>Additional Columns</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {extraCols.map(c => (
                      <ColCheckbox key={c.label} label={c.label} checked={checked[c.label] ?? false} onChange={() => toggle(c.label)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 22px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", gap: 10, justifyContent: "flex-end",
          borderRadius: "0 0 20px 20px",
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedCols.length === 0}
            style={{
              padding: "9px 18px", borderRadius: 10,
              display: "flex", alignItems: "center", gap: 7,
              background: selectedCols.length === 0 ? "rgba(48,125,192,0.3)" : "#307DC0",
              border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: selectedCols.length === 0 ? "not-allowed" : "pointer",
              opacity: selectedCols.length === 0 ? 0.6 : 1,
            }}
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
