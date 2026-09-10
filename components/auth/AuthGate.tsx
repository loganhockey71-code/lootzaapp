"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAppState } from "@/lib/state/AppStateContext";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Logo } from "@/components/layout/Logo";

const AUTH_ROUTES = ["/login", "/signup"];

/**
 * Gates the whole marketplace behind a real Supabase-authenticated session. Auth
 * pages render standalone (no marketplace chrome); everything else waits for a
 * signed-in user before mounting, redirecting to /login otherwise.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, hydrated } = useAppState();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!user && !isAuthRoute) router.replace("/login");
    if (user && isAuthRoute) router.replace("/discover");
  }, [hydrated, user, isAuthRoute, router]);

  if (isAuthRoute) return <>{children}</>;

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <Logo />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-primary-50">
          <div className="animate-shimmer h-full w-full bg-gradient-to-r from-primary-50 via-primary-500 to-primary-50" />
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar />
      <MobileHeader />
      <div className="flex-1 md:flex">
        <Sidebar />
        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </>
  );
}
