"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options:     Option[];
  selected:    string[];
  onChange:    (values: string[]) => void;
  placeholder: string;
  className?:  string;
}

export function MultiSelect({ options, selected, onChange, placeholder, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? placeholder
      : `${selected.length} selected`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl transition-colors",
          className
        )}
        style={{
          border:     "1px solid rgba(255,255,255,0.08)",
          color:      "#f1f5f9",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={13} style={{ color: "#475569", flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute z-50 mt-1.5 min-w-full rounded-xl overflow-hidden"
            style={{
              background: "#0F2032",
              border:     "1px solid rgba(48,125,192,0.15)",
              boxShadow:  "0 10px 30px rgba(0,0,0,0.5)",
              maxHeight:  260,
              overflowY:  "auto",
            }}
          >
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5"
                style={{ color: "#307DC0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                Clear selection
              </button>
            )}
            {options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-white/5"
                  style={{ color: checked ? "#e2e8f0" : "#94a3b8" }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0 rounded"
                    style={{
                      width: 14, height: 14,
                      border: `1px solid ${checked ? "#307DC0" : "rgba(255,255,255,0.2)"}`,
                      background: checked ? "#307DC0" : "transparent",
                    }}
                  >
                    {checked && <Check size={10} className="text-white" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
