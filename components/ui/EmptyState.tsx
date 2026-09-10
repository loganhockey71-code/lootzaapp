import Link from "next/link";
import { Inbox, type LucideIcon } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({
  title,
  body,
  icon: Icon = Inbox,
  actionLabel,
  actionHref,
}: {
  title: string;
  body: string;
  icon?: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink-soft">
        <Icon size={28} aria-hidden />
      </span>
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <p className="max-w-xs text-sm text-ink-soft">{body}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button size="sm" className="mt-2">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
