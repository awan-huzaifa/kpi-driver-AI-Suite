"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog        = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose   = D.Close;

export function DialogContent({
  children,
  title,
  description,
  className,
}: {
  children:     React.ReactNode;
  title:        string;
  description?: string;
  className?:   string;
}) {
  return (
    <D.Portal>
      <D.Overlay
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
          "w-full max-w-md glass rounded-2xl p-6 shadow-2xl",
          "focus:outline-none",
          className
        )}
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(48,125,192,0.1)" }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <D.Title className="text-base font-semibold text-white">{title}</D.Title>
            {description && (
              <D.Description className="text-xs mt-0.5" style={{ color: "#475569" }}>
                {description}
              </D.Description>
            )}
          </div>
          <D.Close
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "#475569" }}
          >
            <X size={14} />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 mt-6">{children}</div>;
}
