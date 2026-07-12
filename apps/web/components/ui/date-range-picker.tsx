"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export type DatePeriod = "today" | "yesterday" | "7d" | "30d" | "month" | "all" | "custom";

export const DATE_PRESETS: { value: DatePeriod; label: string }[] = [
  { value: "today",     label: "Today"        },
  { value: "yesterday", label: "Yesterday"    },
  { value: "7d",        label: "Last 7 Days"  },
  { value: "30d",       label: "Last 30 Days" },
  { value: "month",     label: "This Month"   },
  { value: "all",       label: "All Time"     },
  { value: "custom",    label: "Custom"       },
];

export function periodBounds(
  period: DatePeriod,
  customFrom: string,
  customTo: string,
): { from: Date | null; to: Date | null } {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const DAY   = 86_400_000;

  switch (period) {
    case "today":     return { from: today, to: null };
    case "yesterday": return { from: new Date(today.getTime() - DAY), to: today };
    case "7d":        return { from: new Date(today.getTime() - 7  * DAY), to: null };
    case "30d":       return { from: new Date(today.getTime() - 30 * DAY), to: null };
    case "month":     return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null };
    case "all":       return { from: null, to: null };
    case "custom":    return {
      from: customFrom ? new Date(customFrom)             : null,
      to:   customTo   ? new Date(`${customTo}T23:59:59`) : null,
    };
  }
}

/* ── helpers ────────────────────────────────────────── */

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function fmtDisplay(s: string): string {
  const d = parseYMD(s);
  if (!d) return "Pick date";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── CalendarPopup ──────────────────────────────────── */

interface CalendarPopupProps {
  value:     string;
  from:      string;
  to:        string;
  onSelect:  (ymd: string) => void;
  onClose:   () => void;
}

function CalendarPopup({ value, from, to, onSelect, onClose }: CalendarPopupProps) {
  const now      = new Date();
  const initDate = parseYMD(value) ?? now;
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const fromDate = parseYMD(from);
  const toDate   = parseYMD(to);

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function dayState(day: number | null): "selected" | "range" | "range-edge" | "today" | "normal" | "empty" {
    if (!day) return "empty";
    const ymd = toYMD(new Date(viewYear, viewMonth, day));
    if (ymd === value) return "selected";
    if (ymd === from || ymd === to) return "range-edge";
    if (fromDate && toDate && new Date(viewYear, viewMonth, day) > fromDate && new Date(viewYear, viewMonth, day) < toDate) return "range";
    if (ymd === toYMD(now)) return "today";
    return "normal";
  }

  const BG = "#0b1929";

  return (
    <div
      ref={ref}
      style={{
        position: "absolute", zIndex: 9999, top: "calc(100% + 6px)", left: 0,
        background: BG, border: "1px solid rgba(48,125,192,0.25)",
        borderRadius: 14, padding: "16px 14px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)",
        minWidth: 260,
        userSelect: "none",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button
          onClick={prevMonth}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: "2px 6px", borderRadius: 6, lineHeight: 1 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
        >
          <ChevronLeft size={15} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: "2px 6px", borderRadius: 6, lineHeight: 1 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#334155", paddingBottom: 4 }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const state = dayState(day);
          const ymd = toYMD(new Date(viewYear, viewMonth, day));
          const isSelected  = state === "selected" || state === "range-edge";
          const isRange     = state === "range";
          const isToday     = state === "today";
          return (
            <button
              key={i}
              onClick={() => { onSelect(ymd); onClose(); }}
              style={{
                width: "100%", aspectRatio: "1", border: "none", borderRadius: 7,
                fontSize: 12, fontWeight: isSelected ? 700 : 400,
                cursor: "pointer",
                transition: "background 0.1s, color 0.1s",
                background: isSelected ? "#307DC0"
                           : isRange    ? "rgba(48,125,192,0.15)"
                           : "transparent",
                color: isSelected ? "#fff"
                     : isToday    ? "#307DC0"
                     : isRange    ? "rgba(255,255,255,0.8)"
                     : "#94a3b8",
                outline: isToday && !isSelected ? "1px solid rgba(48,125,192,0.4)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = "rgba(48,125,192,0.25)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = isRange ? "rgba(48,125,192,0.15)" : "transparent";
                }
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, textAlign: "center" }}>
        <button
          onClick={() => { onSelect(toYMD(now)); onClose(); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 600, color: "#307DC0",
            letterSpacing: "0.03em",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#78ABD6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#307DC0")}
        >
          Today
        </button>
      </div>
    </div>
  );
}

/* ── DateField (the clickable from/to input) ────────── */

interface DateFieldProps {
  label:    string;
  value:    string;
  from:     string;
  to:       string;
  onChange: (v: string) => void;
}

function DateField({ label, value, from, to, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color: "#475569",
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}>
          {label}
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontSize: 12, fontWeight: 500,
            color: value ? "#e2e8f0" : "#475569",
            textAlign: "left", whiteSpace: "nowrap",
          }}
        >
          {fmtDisplay(value)}
        </button>
      </div>

      {open && (
        <CalendarPopup
          value={value}
          from={from}
          to={to}
          onSelect={onChange}
          onClose={close}
        />
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────── */

interface Props {
  period:       DatePeriod;
  customFrom:   string;
  customTo:     string;
  onPeriod:     (p: DatePeriod) => void;
  onCustomFrom: (v: string) => void;
  onCustomTo:   (v: string) => void;
  /** Highlight color for the active preset. Defaults to #307DC0 (blue). */
  activeColor?: string;
}

export default function DateRangePicker({
  period, customFrom, customTo,
  onPeriod, onCustomFrom, onCustomTo,
  activeColor = "#307DC0",
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Preset pills */}
      <div style={{
        display: "flex", borderRadius: 10, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        width: "fit-content",
      }}>
        {DATE_PRESETS.map((p, i) => (
          <button
            key={p.value}
            onClick={() => onPeriod(p.value)}
            style={{
              padding: "6px 11px", fontSize: 11, fontWeight: 600,
              cursor: "pointer", border: "none",
              borderRight: i < DATE_PRESETS.length - 1
                ? "1px solid rgba(255,255,255,0.06)"
                : "none",
              transition: "background 0.15s, color 0.15s",
              whiteSpace: "nowrap",
              background: period === p.value ? `${activeColor}22` : "transparent",
              color:      period === p.value ? activeColor : "#475569",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {period === "custom" && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 12,
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(48,125,192,0.06)",
          border: "1px solid rgba(48,125,192,0.2)",
          width: "fit-content",
        }}>
          <Calendar size={13} style={{ color: "#307DC0", flexShrink: 0 }} />

          <DateField
            label="From"
            value={customFrom}
            from={customFrom}
            to={customTo}
            onChange={onCustomFrom}
          />

          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

          <DateField
            label="To"
            value={customTo}
            from={customFrom}
            to={customTo}
            onChange={onCustomTo}
          />
        </div>
      )}
    </div>
  );
}
