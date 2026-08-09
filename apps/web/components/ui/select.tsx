"use client";

import { useState } from "react";
import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select(props: S.SelectProps) {
  return <S.Root {...props} />;
}

export function SelectTrigger({
  placeholder,
  className,
}: {
  placeholder?: string;
  className?:   string;
}) {
  return (
    <S.Trigger
      className={cn(
        "flex w-full items-center justify-between px-3 py-2.5 text-sm rounded-xl",
        "transition-all duration-200 focus:outline-none",
        className
      )}
      style={{
        background:  "rgba(255,255,255,0.04)",
        border:      "1px solid rgba(255,255,255,0.08)",
        color:       "#f1f5f9",
      }}
    >
      <S.Value placeholder={<span style={{ color: "#475569" }}>{placeholder}</span>} />
      <S.Icon className="ml-2 flex-shrink-0">
        <ChevronDown size={14} style={{ color: "#475569" }} />
      </S.Icon>
    </S.Trigger>
  );
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return (
    <S.Portal>
      <S.Content
        position="popper"
        side="bottom"
        sideOffset={4}
        avoidCollisions={false}
        className="z-[500] overflow-hidden rounded-xl"
        style={{
          background: "#0D1C2A",
          border:     "1px solid rgba(48,125,192,0.2)",
          boxShadow:  "0 16px 40px rgba(0,0,0,0.6)",
          minWidth:   "var(--radix-select-trigger-width)",
          maxHeight:  "260px",
          overflowY:  "auto",
        }}
      >
        <S.Viewport className="p-1">{children}</S.Viewport>
      </S.Content>
    </S.Portal>
  );
}

export function SelectGroup({ children }: { children: React.ReactNode }) {
  return <S.Group>{children}</S.Group>;
}

export function SelectLabel({ children }: { children: React.ReactNode }) {
  return (
    <S.Label style={{
      fontSize: 10, fontWeight: 700, color: "#307DC0",
      textTransform: "uppercase", letterSpacing: "0.08em",
      padding: "8px 12px 4px",
    }}>
      {children}
    </S.Label>
  );
}

export function SelectSeparator() {
  return <S.Separator style={{ height: 1, background: "rgba(48,125,192,0.12)", margin: "4px 0" }} />;
}

export function SelectItem({
  value,
  children,
}: {
  value:    string;
  children: React.ReactNode;
}) {
  return (
    <S.Item
      value={value}
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer",
        "outline-none data-[highlighted]:bg-[rgba(48,125,192,0.12)] data-[highlighted]:text-white",
        "transition-colors duration-100"
      )}
      style={{ color: "#94a3b8" }}
    >
      <S.ItemText>{children}</S.ItemText>
      <S.ItemIndicator className="ml-auto">
        <Check size={12} style={{ color: "#307DC0" }} />
      </S.ItemIndicator>
    </S.Item>
  );
}

// Inline select — renders options in the document flow so the parent container
// expands naturally when open, no portal/z-index fighting.
export function SelectInline({
  value,
  onValueChange,
  placeholder = "Select…",
  groups,
}: {
  value:         string;
  onValueChange: (v: string) => void;
  placeholder?:  string;
  groups:        { label: string; options: { value: string; label: string }[] }[];
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel   = groups.flatMap(g => g.options).find(o => o.value === value)?.label;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 12px", cursor: "pointer",
          background: open ? "rgba(48,125,192,0.08)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(48,125,192,0.35)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: open ? "9px 9px 0 0" : 9,
          color: selectedLabel ? "#f1f5f9" : "#475569",
          fontSize: 13, transition: "background 0.15s, border-color 0.15s",
        }}
      >
        <span>{selectedLabel ?? placeholder}</span>
        <ChevronDown
          size={14}
          style={{ color: "#475569", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div style={{
          background: "#0D1C2A",
          border: "1px solid rgba(48,125,192,0.25)",
          borderTop: "none",
          borderRadius: "0 0 9px 9px",
          maxHeight: 240,
          overflowY: "auto",
        }}>
          {groups.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div style={{ height: 1, background: "rgba(48,125,192,0.12)", margin: "2px 0" }} />}
              <p style={{ fontSize: 10, fontWeight: 700, color: "#307DC0", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 12px 4px", margin: 0 }}>
                {group.label}
              </p>
              {group.options.map(opt => {
                const selected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onValueChange(opt.value); setOpen(false); }}
                    style={{
                      width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", border: "none", cursor: "pointer",
                      background: selected ? "rgba(48,125,192,0.12)" : "transparent",
                      color: selected ? "#f1f5f9" : "#94a3b8",
                      fontSize: 13,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(48,125,192,0.08)"; (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected ? "rgba(48,125,192,0.12)" : "transparent"; (e.currentTarget as HTMLElement).style.color = selected ? "#f1f5f9" : "#94a3b8"; }}
                  >
                    <span>{opt.label}</span>
                    {selected && <Check size={12} style={{ color: "#307DC0", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
