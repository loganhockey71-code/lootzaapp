"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Like/Comment/Save/Share button used in both the mobile TikTok-style overlay
 * (theme="dark", floating on video) and the desktop YouTube-style rail that
 * sits beside the card instead of on top of it (theme="light").
 */
export function RailButton({
  icon: Icon,
  label,
  active,
  onClick,
  theme = "dark",
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  theme?: "dark" | "light";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex flex-col items-center gap-1", theme === "dark" ? "text-white" : "text-ink-soft")}
      aria-label={label}
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90",
          theme === "dark"
            ? cn("backdrop-blur", active ? "bg-white text-primary-600" : "bg-white/15 text-white hover:bg-white/25")
            : cn(
                "border",
                active
                  ? "border-primary-200 bg-primary-50 text-primary-600"
                  : "border-border bg-surface text-ink-soft hover:bg-surface-2 hover:text-ink"
              )
        )}
      >
        <Icon size={20} className={cn(active && "fill-current")} aria-hidden />
      </span>
      <span className={cn("text-[11px] font-semibold", theme === "dark" && "drop-shadow")}>{label}</span>
    </button>
  );
}
