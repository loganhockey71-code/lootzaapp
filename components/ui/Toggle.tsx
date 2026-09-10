import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-ink/15"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary-600" : "bg-border"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
