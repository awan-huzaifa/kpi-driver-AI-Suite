import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("input-dark w-full px-3 py-2.5 text-sm", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
