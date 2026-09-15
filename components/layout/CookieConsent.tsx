"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "lootza:cookie-consent";

/** Simple accept-only cookie notice, shown once per browser until dismissed. */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Reading localStorage (not available during SSR) — there's no way to
    // derive this during the initial render without a hydration mismatch,
    // so it's synced right after mount instead.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="flex w-full max-w-2xl flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card-hover sm:flex-row sm:items-center sm:gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-soft">
          <Cookie size={18} aria-hidden />
        </span>
        <p className="flex-1 text-sm text-ink-soft">
          Lootza uses cookies to keep you signed in and improve the marketplace. By continuing, you agree to our{" "}
          <Link href="/privacy" className="font-semibold text-primary-600 hover:text-primary-700">
            Privacy Policy
          </Link>
          .
        </p>
        <Button size="sm" onClick={accept} className="w-full shrink-0 sm:w-auto">
          Accept
        </Button>
      </div>
    </div>
  );
}
