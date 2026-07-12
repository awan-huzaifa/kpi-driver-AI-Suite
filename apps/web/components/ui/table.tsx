import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm border-collapse", className)}>{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children, className, style, onClick,
}: { children?: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <tr
      className={cn("border-b transition-colors duration-100", onClick && "cursor-pointer", className)}
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn("text-left px-4 py-3 text-xs font-semibold whitespace-nowrap", className)}
      style={{ color: "#7a8ba3", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className, style, colSpan }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties; colSpan?: number }) {
  return <td className={cn("px-4 py-3.5", className)} style={style} colSpan={colSpan}>{children}</td>;
}
