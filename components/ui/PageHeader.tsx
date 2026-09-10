import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {Icon && (
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-ink-soft sm:h-10 sm:w-10",
                iconClassName
              )}
            >
              <Icon size={20} aria-hidden />
            </span>
          )}
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
