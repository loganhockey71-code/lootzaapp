"use client";

import { useState } from "react";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/types";
import { useAppState } from "@/lib/state/AppStateContext";
import { startCheckout } from "@/lib/supabase/checkout";
import { formatPrice } from "@/lib/utils";

export function BuyModal({
  product,
  open,
  onClose,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
}) {
  const { user, purchase, isOwned } = useAppState();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRealProduct = !!product.sellerId;
  const owned = isOwned(product.id);
  const isSelfProduct = isRealProduct && product.sellerId === user?.id;
  const alreadyOwnedReal = isRealProduct && owned;

  async function handleConfirm() {
    if (alreadyOwnedReal) return;
    setError(null);
    setSubmitting(true);

    // Real (Supabase-backed) products are paid for through Stripe Checkout —
    // this navigates the tab away, so the purchases row (and the XP/coins/
    // collection rewards below) only get granted once payment actually
    // succeeds, back on the product page (see ProductDetailClient).
    if (product.sellerId) {
      const result = await startCheckout(product.id);
      if (!result.ok) {
        setSubmitting(false);
        setError(result.error);
      }
      return;
    }

    setSubmitting(false);
    purchase(product.id);
    setConfirmed(true);
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      setConfirmed(false);
      setError(null);
    }, 200);
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {confirmed || owned ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-[var(--shadow-glow-primary)]">
            <PartyPopper size={32} aria-hidden />
          </span>
          <h3 className="font-display text-xl font-extrabold text-ink">You got it!</h3>
          <p className="text-sm text-ink-soft">
            <strong>{product.title}</strong> has been added to your collection.
            <br />
            {isRealProduct ? "Payment confirmed." : "This is a demo purchase. No real payment was made."}
          </p>
          <div className="mt-3 flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Keep Browsing
            </Button>
            <Link href="/collection" className="flex-1">
              <Button className="w-full">View Collection</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-xl font-extrabold text-ink">Confirm your drop</h3>
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-4">
            <div>
              <p className="font-semibold text-ink">{product.title}</p>
              <p className="text-xs text-ink-soft">{product.usageRights} · Instant download</p>
            </div>
            <span className="text-lg font-extrabold text-ink">{formatPrice(product.price)}</span>
          </div>
          <p className="text-xs text-ink-soft">
            {isRealProduct
              ? "You'll be redirected to Stripe to pay securely. Your purchase is recorded once payment succeeds."
              : "This is a frontend demo, no payment provider is connected. Clicking confirm records this as a real purchase on your account."}
          </p>
          {isSelfProduct && <p className="text-sm font-medium text-red-600">You can&apos;t buy your own product.</p>}
          {alreadyOwnedReal && <p className="text-sm font-medium text-red-600">You already own this product.</p>}
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={isSelfProduct || alreadyOwnedReal || submitting}
            >
              {submitting ? "Redirecting…" : isRealProduct ? "Continue to Payment" : "Confirm Purchase"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
