import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
};

export function Select({ label, hint, id, className = "", children, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`h-11 rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:bg-neutral-100 ${className}`}
        {...props}
      >
        {children}
      </select>
      {hint && <p className="text-sm text-neutral-500">{hint}</p>}
    </div>
  );
}