import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
