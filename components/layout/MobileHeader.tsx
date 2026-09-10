"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Search,
  Heart,
  Menu,
  LayoutGrid,
  Bookmark,
  Gift,
  LineChart,
  LogOut,
  Bell,
  Coins,
  ListChecks,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./Logo";
import { SearchBar } from "@/components/search/SearchBar";
import { useAppState } from "@/lib/state/AppStateContext";

const MENU_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/drops", label: "Drops", icon: Gift },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/wallet", label: "Wallet & Shop", icon: Coins },
  { href: "/challenges", label: "Challenges", icon: ListChecks },
  { href: "/dashboard", label: "Seller Dashboard", icon: LineChart },
];

export function MobileHeader() {
  const router = useRouter();
  const { liked, logOut, unreadNotificationCount } = useAppState();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur md:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <Logo />
        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:bg-surface-2"
          >
            <Search size={20} aria-hidden />
          </button>
          <Link
            href="/liked"
            aria-label="Liked"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:bg-surface-2"
          >
            <Heart size={20} aria-hidden />
            {liked.length > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-600 text-[9px] font-bold text-white">
                {liked.length}
              </span>
            )}
          </Link>
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:bg-surface-2"
          >
            <Bell size={20} aria-hidden />
            {unreadNotificationCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-600 text-[9px] font-bold text-white">
                {unreadNotificationCount}
              </span>
            )}
          </Link>
          <button
            aria-label="More"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:bg-surface-2"
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="animate-pop-in border-t border-border px-4 py-3">
          <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      )}

      {menuOpen && (
        <div className="animate-pop-in flex flex-col gap-1 border-t border-border px-4 py-3">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
            >
              <item.icon size={18} aria-hidden />
              {item.label}
            </Link>
          ))}
          <button
            onClick={async () => {
              setMenuOpen(false);
              await logOut();
              router.push("/login");
            }}
            className="flex items-center gap-2.5 rounded-xl border-t border-border px-3 pb-2.5 pt-3.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} aria-hidden /> Log Out
          </button>
        </div>
      )}
    </header>
  );
}
