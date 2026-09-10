import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 shadow-sm disabled:hover:bg-primary-600",
  secondary: "bg-surface-2 text-ink hover:bg-border/70",
  outline: "border border-border bg-surface text-ink hover:border-ink/20 hover:bg-surface-2",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
  danger: "bg-red-50 text-red-600 hover:bg-red-100",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
