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
          "w-full max-w-md glass rounded-2xl shadow-2xl",
          "flex flex-col focus:outline-none",
          className
        )}
        style={{
          boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(48,125,192,0.1)",
          maxHeight: "90vh",
        }}
      >
        {/* Sticky header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
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
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 pb-6" style={{ scrollbarWidth: "thin" }}>
          {children}
        </div>
      </D.Content>
    </D.Portal>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex justify-end gap-2 pt-4 mt-4"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      {children}
    </div>
  );
}
