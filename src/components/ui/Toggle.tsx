type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  id?: string;
};

export function Toggle({ checked, onChange, label, hint, id }: ToggleProps) {
  const toggleId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={toggleId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
          checked ? "bg-primary-600" : "bg-neutral-300"
        }`}
      >
        <span
          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5.5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}