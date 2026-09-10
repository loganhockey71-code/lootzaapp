"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/state/AppStateContext";
import { NOTIFICATION_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/types";

/** Icon-chip color per notification type, grouped by meaning rather than one flat purple for everything. */
const TYPE_STYLES: Record<NotificationType, { bg: string; text: string }> = {
  comment: { bg: "bg-surface-2", text: "text-ink-soft" },
  reply: { bg: "bg-surface-2", text: "text-ink-soft" },
  follow: { bg: "bg-surface-2", text: "text-ink-soft" },
  collaboration: { bg: "bg-surface-2", text: "text-ink-soft" },
  sale: { bg: "bg-accent-50", text: "text-accent-600" },
  purchase: { bg: "bg-accent-50", text: "text-accent-600" },
  "new-drop": { bg: "bg-accent-50", text: "text-accent-600" },
  "limited-drop": { bg: "bg-red-50", text: "text-red-600" },
  leaderboard: { bg: "bg-primary-50", text: "text-primary-600" },
  "level-up": { bg: "bg-primary-50", text: "text-primary-600" },
  coins: { bg: "bg-primary-50", text: "text-primary-600" },
  achievement: { bg: "bg-primary-50", text: "text-primary-600" },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const { notifications, markAllNotificationsRead, markNotificationRead } = useAppState();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle={`${notifications.filter((n) => !n.read).length} unread`}
        action={
          notifications.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllNotificationsRead}>
              <CheckCheck size={14} aria-hidden /> Mark all read
            </Button>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          body="Sales, comments, level-ups, and drops from creators you follow will show up here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const Icon = NOTIFICATION_ICONS[n.type];
            const style = TYPE_STYLES[n.type];
            const content = (
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", style.bg, style.text)}>
                  <Icon size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm text-ink", n.read ? "font-semibold" : "font-bold")}>{n.title}</p>
                  <p className="text-sm text-ink-soft">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-soft">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden />}
              </div>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} onClick={() => markNotificationRead(n.id)}>
                    {content}
                  </Link>
                ) : (
                  <button className="w-full text-left" onClick={() => markNotificationRead(n.id)}>
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
