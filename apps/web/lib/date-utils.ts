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

function parseYMD(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function fmtDisplay(s: string): string {
  const d = parseYMD(s);
  if (!d) return "Pick date";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
