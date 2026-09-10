import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";

/**
 * Shared shell for /terms, /privacy, /refund-policy, and /contact. Rendered
 * standalone (no app chrome, no auth required) — see the PUBLIC_ROUTES list
 * in components/auth/AuthGate.tsx — so these pages are reachable by anyone,
 * signed in or not, including a Stripe reviewer who has no Lootza account.
 */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {updated && <p className="mt-2 text-sm text-ink-soft">Last updated: {updated}</p>}
        <div className="legal-copy mt-8 flex flex-col gap-6 text-[15px] leading-relaxed text-ink-soft">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-xl font-bold text-ink">{children}</h2>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-1.5 pl-5 [&>li]:list-disc">{children}</ul>;
}
