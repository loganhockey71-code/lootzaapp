"use client";

import { useState } from "react";
import { Rocket, Coins, CreditCard, TrendingUp, Package } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProductPicker } from "@/components/sell/ProductPicker";
import { useAppState } from "@/lib/state/AppStateContext";
import { AD_COIN_TIERS, AD_DURATIONS_DAYS, MIN_AD_SPEND_USD, adSpendToUsd, estimateAdReach } from "@/lib/ads";
import type { Product, PromotionMethod } from "@/lib/types";
import { cn, formatCompactNumber } from "@/lib/utils";

export function PromoteModal({
  open,
  onClose,
  products,
  initialProductId,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: string | null;
}) {
  const { createPromotion, coins } = useAppState();
  const [productId, setProductId] = useState<string | null>(initialProductId ?? products[0]?.id ?? null);
  const [method, setMethod] = useState<PromotionMethod>("coins");
  const [dailyCoins, setDailyCoins] = useState(AD_COIN_TIERS[0].coins);
  const [dailyCash, setDailyCash] = useState("10");
  const [duration, setDuration] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const product = products.find((p) => p.id === productId) ?? null;
  const dailyBudget = method === "coins" ? dailyCoins : Number(dailyCash) || 0;
  const dailyUsd = adSpendToUsd(method, dailyBudget);
  const belowMinimum = dailyUsd < MIN_AD_SPEND_USD - 0.001;
  const totalBudget = Math.round(dailyBudget * duration);
  const dailyEstimate = estimateAdReach(dailyUsd);
  const totalEstimate = estimateAdReach(adSpendToUsd(method, totalBudget));

  function handleClose() {
    onClose();
    setTimeout(() => {
      setSuccess(false);
      setError(null);
    }, 200);
  }

  function handleConfirm() {
    if (!product || belowMinimum) return;
    const result = createPromotion(product, method, dailyBudget, duration);
    if (result.ok) {
      setSuccess(true);
      setError(null);
    } else {
      setError(result.error);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} className="max-h-[85vh] overflow-y-auto">
      {success ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-[var(--shadow-glow-primary)]">
            <Rocket size={32} aria-hidden />
          </span>
          <h3 className="font-display text-xl font-extrabold text-ink">Promotion started!</h3>
          <p className="text-sm text-ink-soft">
            <strong>{product?.title}</strong> is now being promoted.
            <br />
            This is a demo purchase. No real payment was made.
          </p>
          <Button className="mt-3 w-full" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-xl font-extrabold text-ink">Promote a product</h3>
          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2/40 px-4 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink-soft">
                <Package size={18} aria-hidden />
              </span>
              <p className="text-sm text-ink-soft">Drop a product first to promote it.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink">Product</span>
                <ProductPicker products={products} value={productId} onChange={setProductId} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink">Pay with</span>
                <div className="flex gap-2">
                  {(["coins", "cash"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                        method === m ? "border-primary-600 bg-primary-50 text-primary-700" : "border-border text-ink-soft"
                      )}
                    >
                      {m === "coins" ? <Coins size={15} aria-hidden /> : <CreditCard size={15} aria-hidden />}
                      {m === "coins" ? "Lootza Coins" : "Real Money"}
                    </button>
                  ))}
                </div>
                {method === "coins" && <p className="text-xs text-ink-soft">Balance: {coins.toLocaleString()} coins</p>}
              </div>

              {method === "coins" ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-ink">Daily budget</span>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {AD_COIN_TIERS.map((tier) => (
                      <button
                        key={tier.coins}
                        type="button"
                        onClick={() => setDailyCoins(tier.coins)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors",
                          dailyCoins === tier.coins
                            ? "border-primary-600 bg-primary-50 text-primary-700"
                            : "border-border text-ink-soft hover:border-primary-300"
                        )}
                      >
                        <span className="font-display text-sm font-extrabold">{tier.coins.toLocaleString()}</span>
                        <span className="text-[10px]">≈ ${tier.usd}/day</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-ink">Daily budget (USD)</span>
                  <input
                    type="number"
                    min={MIN_AD_SPEND_USD}
                    step={1}
                    value={dailyCash}
                    onChange={(e) => setDailyCash(e.target.value)}
                    className="input"
                  />
                  <span className={cn("text-xs", belowMinimum ? "font-semibold text-red-600" : "text-ink-soft")}>
                    Minimum ad spend is ${MIN_AD_SPEND_USD}/day.
                  </span>
                </label>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink">Campaign duration</span>
                <div className="flex gap-2">
                  {AD_DURATIONS_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                        duration === d ? "border-primary-600 bg-primary-50 text-primary-700" : "border-border text-ink-soft"
                      )}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface-2 p-4">
                <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink">
                  <TrendingUp size={15} className="text-ink-soft" aria-hidden /> Estimated results
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-display text-lg font-extrabold text-ink">{formatCompactNumber(totalEstimate.views)}</p>
                    <p className="text-[11px] text-ink-soft">Total views</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-extrabold text-ink">{formatCompactNumber(totalEstimate.clicks)}</p>
                    <p className="text-[11px] text-ink-soft">Total clicks</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-extrabold text-ink">{formatCompactNumber(totalEstimate.sales)}</p>
                    <p className="text-[11px] text-ink-soft">Est. sales</p>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-ink-soft">
                  ~{formatCompactNumber(dailyEstimate.views)} views/day · {duration} days · Total budget{" "}
                  <strong className="text-ink">
                    {method === "cash" ? `$${totalBudget.toFixed(2)}` : `${totalBudget.toLocaleString()} coins`}
                  </strong>
                </p>
              </div>

              <p className="text-xs text-ink-soft">
                This is a frontend demo, so your campaign&apos;s views, clicks, and sales are simulated
                {method === "cash" ? " and no payment provider is connected" : ""}.
              </p>

              {error && <p className="text-sm font-medium text-red-600">{error}</p>}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-1.5" onClick={handleConfirm} disabled={!product || belowMinimum}>
                  <Rocket size={15} aria-hidden /> Start Promoting
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
