import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Input({ label, error, hint, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`h-11 rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:bg-neutral-100 ${error ? "border-error-500" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-error-600">{error}</p>}
      {hint && !error && <p className="text-sm text-neutral-500">{hint}</p>}
    </div>
  );
}
