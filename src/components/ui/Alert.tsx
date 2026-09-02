import type { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
};

const variantClasses: Record<AlertVariant, string> = {
  info: "border-info-500 bg-blue-50 text-info-700",
  success: "border-success-500 bg-green-50 text-success-700",
  warning: "border-warning-500 bg-orange-50 text-warning-700",
  error: "border-error-500 bg-red-50 text-error-700",
};

export function Alert({ variant = "info", title, children }: AlertProps) {
  return (
    <div className={`rounded-xl border-l-4 p-4 ${variantClasses[variant]}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-sm">{children}</div>
    </div>
  );
}
