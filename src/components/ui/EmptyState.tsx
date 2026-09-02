import type { ReactNode } from "react";
import { Button } from "./Button";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
      {icon && <div className="text-neutral-400">{icon}</div>}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        {description && <p className="max-w-sm text-sm text-neutral-600">{description}</p>}
      </div>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
