import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
type Size    = "sm" | "md" | "lg" | "icon";

// "primary" is styled entirely via the .btn-primary global class instead of inline styles.
const styles: Partial<Record<Variant, React.CSSProperties>> = {
  secondary:   { background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" },
  ghost:       { color: "#94a3b8" },
  destructive: { background: "rgba(237,31,36,0.12)", color: "#ED1F24", border: "1px solid rgba(237,31,36,0.2)" },
  outline:     { color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" },
};

const sizes: Record<Size, string> = {
  sm:   "text-xs  px-3   py-1.5 gap-1.5",
  md:   "text-sm  px-4   py-2   gap-2",
  lg:   "text-sm  px-5   py-2.5 gap-2",
  icon: "w-8 h-8",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", style, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "ghost" && "hover:bg-white/5",
        variant === "primary" && "btn-primary",
        sizes[size],
        className
      )}
      style={{ ...styles[variant], ...style }}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button };
