"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface Prediction {
  place_id:     string;
  description:  string;
}

interface Props {
  value:       string;
  onChange:    (v: string) => void;
  disabled?:   boolean;
  placeholder?: string;
  className?:  string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function AddressAutocomplete({ value, onChange, disabled, placeholder, className }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const debouncedValue = useDebounce(value, 280);

  // Fetch predictions whenever the debounced input changes
  useEffect(() => {
    if (debouncedValue.length < 3 || !open) {
      setPredictions([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/places/autocomplete?input=${encodeURIComponent(debouncedValue)}`, {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        setPredictions(data.predictions ?? []);
        setActiveIdx(-1);
      })
      .catch(err => { if (err.name !== "AbortError") setPredictions([]); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedValue, open]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(description: string) {
    onChange(description);
    setPredictions([]);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || predictions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(predictions[activeIdx].description);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && (loading || predictions.length > 0);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "123 Main St, Miami, FL 33101"}
        required
        disabled={disabled}
        autoComplete="off"
        className={className}
      />

      {showDropdown && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          zIndex: 999,
          background: "#0b1829",
          border: "1px solid rgba(48,125,192,0.25)",
          borderRadius: 10,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}>
          {loading && predictions.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
              <Loader2 size={13} style={{ color: "#475569", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 12, color: "#475569" }}>Looking up addresses…</span>
            </div>
          )}
          {predictions.map((p, i) => (
            <button
              key={p.place_id}
              type="button"
              onMouseDown={() => select(p.description)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 14px",
                background: i === activeIdx ? "rgba(48,125,192,0.12)" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
                borderBottom: i < predictions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(-1)}
            >
              <MapPin size={13} style={{ color: "#307DC0", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: i === activeIdx ? "#f1f5f9" : "#94a3b8", lineHeight: 1.4 }}>
                {p.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
