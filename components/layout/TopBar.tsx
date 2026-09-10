"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut, Bell } from "lucide-react";
import { Logo } from "./Logo";
import { SearchBar } from "@/components/search/SearchBar";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { Button } from "@/components/ui/Button";
import { CoinPill } from "@/components/wallet/CoinPill";
import { useAppState } from "@/lib/state/AppStateContext";
import { creators } from "@/lib/data/creators";

const CURRENT_USER = creators.find((c) => c.id === "pixelmax")!;

/** Slim YouTube-style top bar: logo, search, and account actions. Primary nav lives in the Sidebar. */
export function TopBar() {
  const router = useRouter();
  const { user, logOut, coins, unreadNotificationCount } = useAppState();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 hidden h-16 border-b border-border bg-surface/90 backdrop-blur md:block">
      <div className="flex h-16 items-center gap-4 px-6">
        <Logo />

        <SearchBar className="mx-2 max-w-2xl flex-1" />

        <nav className="flex items-center gap-3">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            <Bell size={18} aria-hidden />
            {unreadNotificationCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                {unreadNotificationCount}
              </span>
            )}
          </Link>
          <CoinPill coins={coins} />
          <Link href="/sell">
            <Button size="sm">Sell</Button>
          </Link>

          <div className="relative" onMouseEnter={() => setProfileOpen(true)} onMouseLeave={() => setProfileOpen(false)}>
            <button className="flex items-center gap-1 rounded-full p-0.5" aria-label="Profile menu">
              <CreatorAvatar name={CURRENT_USER.name} seed={CURRENT_USER.avatarSeed} size={34} />
              <ChevronDown size={14} className="text-ink-soft" aria-hidden />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full w-52 animate-pop-in rounded-2xl border border-border bg-surface p-2 shadow-card-hover">
                {user && (
                  <div className="border-b border-border px-3 pb-2 pt-1">
                    <p className="truncate text-sm font-bold text-ink">{user.username}</p>
                    <p className="truncate text-xs text-ink-soft">{user.email}</p>
                  </div>
                )}
                <Link
                  href={`/@${CURRENT_USER.handle}`}
                  className="mt-1 block rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2"
                >
                  View Profile
                </Link>
                <Link href="/dashboard" className="block rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2">
                  Seller Dashboard
                </Link>
                <Link href="/wallet" className="block rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2">
                  Wallet & Shop
                </Link>
                <Link href="/challenges" className="block rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2">
                  Challenges
                </Link>
                <button
                  onClick={async () => {
                    await logOut();
                    router.push("/login");
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-border px-3 py-2 pt-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={15} aria-hidden /> Log Out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
