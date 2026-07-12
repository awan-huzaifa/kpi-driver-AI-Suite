"use client";

import * as A from "@radix-ui/react-alert-dialog";
import { Button } from "./button";

export const AlertDialog        = A.Root;
export const AlertDialogTrigger = A.Trigger;

export function AlertDialogContent({
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "destructive",
  onConfirm,
  loading,
}: {
  title:           string;
  description:     string;
  confirmLabel?:   string;
  confirmVariant?: "primary" | "destructive";
  onConfirm:       () => void;
  loading?:        boolean;
}) {
  return (
    <A.Portal>
      <A.Overlay
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      />
      <A.Content
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm glass rounded-2xl p-6 focus:outline-none"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(48,125,192,0.15)" }}
      >
        <A.Title className="text-base font-semibold text-white mb-2">{title}</A.Title>
        <A.Description className="text-sm mb-6" style={{ color: "#64748b" }}>
          {description}
        </A.Description>
        <div className="flex justify-end gap-2">
          <A.Cancel asChild>
            <Button variant="secondary" size="sm">Cancel</Button>
          </A.Cancel>
          <A.Action asChild>
            <Button variant={confirmVariant} size="sm" onClick={onConfirm} disabled={loading}>
              {loading ? "…" : confirmLabel}
            </Button>
          </A.Action>
        </div>
      </A.Content>
    </A.Portal>
  );
}
