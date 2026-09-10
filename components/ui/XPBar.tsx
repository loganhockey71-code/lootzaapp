import { cn } from "@/lib/utils";

export function XPBar({
  xp,
  xpToNextLevel,
  className,
}: {
  xp: number;
  xpToNextLevel: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((xp / xpToNextLevel) * 100));
  return (
    <div className={cn("w-full", className)}>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary-500 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">
        {xp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
      </p>
    </div>
  );
}
