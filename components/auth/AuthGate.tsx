"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAppState } from "@/lib/state/AppStateContext";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";

const AUTH_ROUTES = ["/login", "/signup"];

// Reachable by anyone, signed in or not — exempt from the login redirect the
// same way /login and /signup are. Legal/support pages render their own
// chrome (see components/legal/LegalPage.tsx); /forgot-password and
// /reset-password render the same standalone Logo+card layout as /login (a
// logged-out user who forgot their password can't log in to pass the
// AuthGate first, so those two must stay reachable without a session).
const PUBLIC_ROUTES = ["/terms", "/privacy", "/refund-policy", "/contact", "/forgot-password", "/reset-password"];

/**
 * Gates the whole marketplace behind a real Supabase-authenticated session. Auth
 * pages and public/legal pages render standalone (no marketplace chrome);
 * everything else waits for a signed-in user before mounting, redirecting to
 * /login otherwise.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, hydrated } = useAppState();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isPublicRoute = isAuthRoute || PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!user && !isPublicRoute) router.replace("/login");
    if (user && isAuthRoute) router.replace("/discover");
  }, [hydrated, user, isAuthRoute, isPublicRoute, router]);

  if (isPublicRoute) return <>{children}</>;

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
        <main className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </div>
      <BottomNav />
    </>
  );
}
