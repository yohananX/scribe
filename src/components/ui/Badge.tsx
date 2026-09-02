import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "error" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  primary: "bg-primary-100 text-primary-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-orange-100 text-orange-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

export function Badge({ variant = "neutral", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
