import { cn } from "@/lib/utils";

type BadgeVariant =
  | "super_admin" | "admin" | "user"
  | "fus" | "acq" | "tc" | "cc" | "none"
  | "active" | "inactive";

const MAP: Record<BadgeVariant, { color: string; bg: string; label: string }> = {
  super_admin: { color: "#307DC0", bg: "rgba(48,125,192,0.12)",  label: "Super Admin" },
  admin:       { color: "#43B749", bg: "rgba(67,183,73,0.12)",   label: "Admin"       },
  user:        { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", label: "User"        },
  fus:         { color: "#43B749", bg: "rgba(67,183,73,0.1)",    label: "FUS"         },
  acq:         { color: "#FCAF17", bg: "rgba(252,175,23,0.1)",   label: "ACQ"         },
  tc:          { color: "#ED1F24", bg: "rgba(237,31,36,0.1)",    label: "TC"          },
  cc:          { color: "#307DC0", bg: "rgba(48,125,192,0.1)",   label: "CC"          },
  none:        { color: "#475569", bg: "rgba(71,85,105,0.1)",    label: "None"        },
  active:      { color: "#43B749", bg: "rgba(67,183,73,0.1)",    label: "Active"      },
  inactive:    { color: "#ED1F24", bg: "rgba(237,31,36,0.1)",    label: "Inactive"    },
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ variant, className, children }: BadgeProps) {
  const s = MAP[variant];
  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", className)}
      style={{ color: s.color, background: s.bg }}
    >
      {children ?? s.label}
    </span>
  );
}
