"use client";

import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fetchPayoutStatus, startPayoutOnboarding, type PayoutStatus } from "@/lib/supabase/connect";

/**
 * Shown on the seller dashboard so a seller with real listings knows whether
 * Stripe can actually pay them yet. app/api/checkout refuses to sell a
 * seller's products for real money until this is true — this is what gets
 * them there.
 */
export function PayoutStatusBanner() {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPayoutStatus()
      .then((s) => {
        if (active) setStatus(s);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleClick() {
    setError(null);
    setStarting(true);
    const result = await startPayoutOnboarding();
    if (!result.ok) {
      setStarting(false);
      setError(result.error);
    }
  }

  if (loading) return null;

  if (status?.payoutsEnabled) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        <CheckCircle2 size={18} aria-hidden /> Payouts are set up — you&apos;ll be paid automatically for every sale.
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2 text-amber-800">
        <Banknote size={18} className="mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-semibold">
            {status?.connected ? "Finish setting up payouts" : "Set up payouts to get paid"}
          </p>
          <p className="text-xs text-amber-700">
            Buyers can&apos;t check out on your products until Stripe can pay you. Takes a couple of minutes.
          </p>
          {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </div>
      <Button size="sm" onClick={handleClick} disabled={starting} className="shrink-0 gap-1.5">
        {starting ? (
          <>
            <Loader2 size={14} className="animate-spin" aria-hidden /> Redirecting…
          </>
        ) : status?.connected ? (
          "Continue setup"
        ) : (
          "Set up payouts"
        )}
      </Button>
    </div>
  );
}
