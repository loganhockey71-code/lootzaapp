/**
 * Wraps a still-a-placeholder value (business name, support email, etc.) in a
 * visible highlight so it's obvious on the live page — not just in source —
 * that it needs to be replaced with real information before launch.
 */
export function Fill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-900">
      {children}
    </span>
  );
}
