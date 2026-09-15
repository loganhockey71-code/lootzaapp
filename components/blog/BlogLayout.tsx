import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";

/**
 * Shared shell for /blog and /blog/[slug]. Rendered standalone (no app
 * chrome, no auth required) — see the PUBLIC_ROUTES check in
 * components/auth/AuthGate.tsx — so search engines and signed-out visitors
 * can actually reach it, which is the entire point of a content-marketing
 * surface like this.
 */
export function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-border bg-surface/80 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <Link href="/discover" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
            Back to Lootza
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">{children}</main>

      <Footer />
    </div>
  );
}
