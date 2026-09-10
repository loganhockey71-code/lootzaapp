"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Gift, Trophy, Package, Heart, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/drops", label: "Drops", icon: Gift },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/collection", label: "Collection", icon: Package },
  { href: "/liked", label: "Liked", icon: Heart },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-surface px-3 py-4 md:flex">
      {ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-primary-50 text-primary-700" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
            )}
          >
            <item.icon size={19} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
