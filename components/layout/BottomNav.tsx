"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Gift, Plus, Package, type LucideIcon } from "lucide-react";
import { creators } from "@/lib/data/creators";
import { cn } from "@/lib/utils";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";

const CURRENT_USER = creators.find((c) => c.id === "pixelmax")!;

const items: { href: string; label: string; icon: LucideIcon | "profile" }[] = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/drops", label: "Drops", icon: Gift },
  { href: "/sell", label: "Sell", icon: Plus },
  { href: "/collection", label: "Collection", icon: Package },
  { href: `/@${CURRENT_USER.handle}`, label: "Profile", icon: "profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const isSell = item.href === "/sell";
          const Icon = item.icon !== "profile" ? item.icon : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary-600" : "text-ink-soft"
              )}
            >
              {isSell && Icon ? (
                <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-white shadow-[var(--shadow-glow-primary)]">
                  <Icon size={22} aria-hidden />
                </span>
              ) : item.icon === "profile" ? (
                <CreatorAvatar
                  name={CURRENT_USER.name}
                  seed={CURRENT_USER.avatarSeed}
                  size={22}
                  className={cn("ring-2", active ? "ring-primary-500" : "ring-transparent")}
                />
              ) : (
                Icon && <Icon size={20} aria-hidden />
              )}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
