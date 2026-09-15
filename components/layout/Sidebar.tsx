"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Gift, Trophy, Package, Heart, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/drops", label: "Drops", icon: Gift },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/collection", label: "Collection", icon: Package },
  { href: "/liked", label: "Liked", icon: Heart },
];

const STORAGE_KEY = "lootza:sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  // Starts expanded on the server and every first client render (SSR can't
  // know localStorage), then syncs to the stored preference right after
  // mount — same flash-then-settle trade-off the app's theme/auth hydration
  // already accepts elsewhere.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Reading localStorage (not available during SSR) — there's no way to
    // derive this during the initial render without a hydration mismatch,
    // so it's synced right after mount instead.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-surface px-3 py-4 transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px] items-center px-2" : "w-56"
      )}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              collapsed && "justify-center px-0",
              active ? "bg-primary-50 text-primary-700" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
            )}
          >
            <item.icon size={19} aria-hidden />
            {!collapsed && item.label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? <PanelLeftOpen size={19} aria-hidden /> : <PanelLeftClose size={19} aria-hidden />}
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
