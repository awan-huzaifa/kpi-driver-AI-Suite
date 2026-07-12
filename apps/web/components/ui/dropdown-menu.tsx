"use client";

import * as DM from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu        = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export function DropdownMenuContent({
  children,
  className,
  align = "end",
}: {
  children:  React.ReactNode;
  className?: string;
  align?:     "start" | "center" | "end";
}) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={4}
        className={cn("z-50 min-w-[140px] rounded-xl p-1 outline-none", className)}
        style={{
          background: "#0F2032",
          border:     "1px solid rgba(48,125,192,0.15)",
          boxShadow:  "0 10px 30px rgba(0,0,0,0.4)",
        }}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  destructive = false,
  className,
  disabled,
}: {
  children:     React.ReactNode;
  onSelect?:    () => void;
  destructive?: boolean;
  className?:   string;
  disabled?:    boolean;
}) {
  return (
    <DM.Item
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none",
        "data-[highlighted]:bg-white/5 transition-colors duration-100",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
      style={{ color: destructive ? "#ED1F24" : "#94a3b8" }}
      onSelect={() => !disabled && onSelect?.()}
    >
      {children}
    </DM.Item>
  );
}

export function DropdownMenuSeparator() {
  return (
    <DM.Separator
      className="my-1 h-px"
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}
