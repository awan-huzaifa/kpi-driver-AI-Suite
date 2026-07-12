"use client";

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
        sideOffset={4}
        className="z-[60] overflow-hidden rounded-xl"
        style={{
          background: "#0F2032",
          border:     "1px solid rgba(48,125,192,0.15)",
          boxShadow:  "0 10px 30px rgba(0,0,0,0.5)",
          minWidth:   "var(--radix-select-trigger-width)",
          maxHeight:  "var(--radix-select-content-available-height)",
        }}
      >
        <S.Viewport className="p-1">{children}</S.Viewport>
      </S.Content>
    </S.Portal>
  );
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
        "outline-none data-[highlighted]:bg-white/5 data-[highlighted]:text-white",
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
