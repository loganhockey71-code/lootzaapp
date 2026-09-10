"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export function Tabs({
  tabs,
  activeId,
  onChange,
  className,
}: {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar flex gap-2 overflow-x-auto", className)}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-95",
              active
                ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                : "border-border bg-surface text-ink-soft hover:border-primary-300 hover:text-ink"
            )}
          >
            {tab.icon && <tab.icon size={14} aria-hidden />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
