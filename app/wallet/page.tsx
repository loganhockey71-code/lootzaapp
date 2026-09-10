"use client";

import { useState } from "react";
import { Coins, Zap, UserPlus, Check, ShoppingBag, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { XPBar } from "@/components/ui/XPBar";
import { cosmetics } from "@/lib/data/cosmetics";
import { coinPackages, type CoinPackage } from "@/lib/data/coinPackages";
import { COSMETIC_TYPE_ICONS } from "@/lib/icons";
import { useAppState, MAX_SIMULATED_REFERRALS } from "@/lib/state/AppStateContext";
import { xpThresholdForLevel } from "@/lib/leveling";
import { cn } from "@/lib/utils";
import type { CosmeticType } from "@/lib/types";

const TYPE_TABS: { id: CosmeticType; label: string }[] = [
  { id: "frame", label: "Frames" },
  { id: "background", label: "Backgrounds" },
  { id: "title", label: "Titles" },
  { id: "collectible", label: "Collectibles" },
  { id: "effect", label: "Effects" },
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function WalletPage() {
  const {
    coins,
    coinTxns,
    level,
    xp,
    ownedCosmetics,
    equipped,
    purchaseCosmetic,
    equipCosmetic,
    simulateReferral,
    purchaseCoins,
    referralCount,
  } = useAppState();
  const [type, setType] = useState<CosmeticType>("frame");
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [purchased, setPurchased] = useState(false);

  const items = cosmetics.filter((c) => c.type === type);
  const referralLimitReached = referralCount >= MAX_SIMULATED_REFERRALS;

  function handleBuy(id: string) {
    const result = purchaseCosmetic(id);
    setError(result.ok ? null : result.error);
  }

  function handleInvite() {
    const result = simulateReferral();
    setError(result.ok ? null : result.error);
  }

  function handleConfirmCoinPurchase() {
    if (!selectedPackage) return;
    purchaseCoins(selectedPackage.id);
    setPurchased(true);
  }

  function closeCoinModal() {
    setSelectedPackage(null);
    setTimeout(() => setPurchased(false), 200);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader icon={Coins} title="Wallet" subtitle="Lootza Coins are your spendable currency. XP never gets spent." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-accent-500 p-6 text-white shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <Coins size={16} aria-hidden /> Lootza Coins
          </div>
          <p className="font-display mt-1 text-4xl font-extrabold">{coins.toLocaleString()}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 gap-1.5 border-white/40 bg-white/10 text-white hover:bg-white/20 disabled:opacity-60"
            onClick={handleInvite}
            disabled={referralLimitReached}
          >
            <UserPlus size={14} aria-hidden />
            {referralLimitReached ? "Referral limit reached" : "Invite a friend (+100)"}
          </Button>
          <p className="mt-1.5 text-xs text-white/70">
            {referralCount}/{MAX_SIMULATED_REFERRALS} referral bonuses used
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <Zap size={16} aria-hidden /> Level {level}
          </div>
          <div className="mt-3">
            <XPBar xp={xp} xpToNextLevel={xpThresholdForLevel(level)} />
          </div>
          <p className="mt-2 text-xs text-ink-soft">XP is progression only. It can never be spent.</p>
        </div>
      </div>

      <h2 className="font-display mb-3 mt-8 text-lg font-bold text-ink">Get Lootza Coins</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {coinPackages.map((pkg) => (
          <div key={pkg.id} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-card">
            {pkg.bonusLabel && (
              <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-600">
                {pkg.bonusLabel}
              </span>
            )}
            <Coins size={22} className="text-accent-500" aria-hidden />
            <p className="font-display text-lg font-extrabold text-ink">{pkg.coins.toLocaleString()}</p>
            <Button size="sm" variant="secondary" className="w-full" onClick={() => setSelectedPackage(pkg)}>
              ${pkg.price.toFixed(2)}
            </Button>
          </div>
        ))}
      </div>

      <h2 className="font-display mb-3 mt-8 text-lg font-bold text-ink">Recent activity</h2>
      {coinTxns.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-ink-soft">
          No coin activity yet. Earn coins from challenges, sales, and achievements.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {coinTxns.slice(0, 8).map((txn) => (
            <div key={txn.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
              <div>
                <p className="font-medium text-ink">{txn.label}</p>
                <p className="text-xs text-ink-soft">{timeAgo(txn.createdAt)}</p>
              </div>
              <span className={cn("font-bold", txn.amount >= 0 ? "text-emerald-600" : "text-red-500")}>
                {txn.amount >= 0 ? "+" : ""}
                {txn.amount}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Coin Shop</h2>
        {error && <span className="text-sm font-medium text-red-600">{error}</span>}
      </div>
      <Tabs
        tabs={TYPE_TABS.map((t) => ({ id: t.id, label: t.label, icon: COSMETIC_TYPE_ICONS[t.id] }))}
        activeId={type}
        onChange={(id) => setType(id as CosmeticType)}
        className="mt-3 mb-5"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const owned = ownedCosmetics.includes(item.id);
          const isEquippable = item.type !== "collectible";
          const equippedId = isEquippable ? equipped[item.type as Exclude<CosmeticType, "collectible">] : null;
          const isEquipped = equippedId === item.id;

          return (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div
                className="flex h-24 items-center justify-center rounded-xl text-white"
                style={{ background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})` }}
              >
                <ShoppingBag size={28} aria-hidden className="opacity-70" />
              </div>
              <div className="flex items-center justify-between">
                <RarityBadge rarity={item.rarity} />
                <span className="inline-flex items-center gap-1 text-sm font-bold text-accent-600">
                  <Coins size={13} aria-hidden /> {item.price}
                </span>
              </div>
              <div>
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="text-sm text-ink-soft">{item.description}</p>
              </div>
              {owned ? (
                isEquippable ? (
                  <Button
                    size="sm"
                    variant={isEquipped ? "secondary" : "outline"}
                    className="gap-1.5"
                    onClick={() => equipCosmetic(item.type as Exclude<CosmeticType, "collectible">, isEquipped ? null : item.id)}
                  >
                    {isEquipped ? (
                      <>
                        <Check size={14} aria-hidden /> Equipped
                      </>
                    ) : (
                      "Equip"
                    )}
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <Check size={14} aria-hidden /> Owned
                  </span>
                )
              ) : (
                <Button size="sm" onClick={() => handleBuy(item.id)}>
                  Buy
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={selectedPackage !== null} onClose={closeCoinModal}>
        {selectedPackage &&
          (purchased ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-card">
                <PartyPopper size={32} aria-hidden />
              </span>
              <h3 className="font-display text-xl font-extrabold text-ink">Coins added!</h3>
              <p className="text-sm text-ink-soft">
                <strong>{selectedPackage.coins.toLocaleString()} Lootza Coins</strong> have been added to your
                balance.
                <br />
                This is a demo purchase. No real payment was made.
              </p>
              <Button className="mt-3 w-full" onClick={closeCoinModal}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h3 className="font-display text-xl font-extrabold text-ink">Confirm your purchase</h3>
              <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-4">
                <div className="flex items-center gap-2">
                  <Coins size={20} className="text-accent-500" aria-hidden />
                  <p className="font-semibold text-ink">{selectedPackage.coins.toLocaleString()} Lootza Coins</p>
                </div>
                <span className="text-lg font-extrabold text-ink">${selectedPackage.price.toFixed(2)}</span>
              </div>
              <p className="text-xs text-ink-soft">
                This is a frontend demo. No payment provider is connected. Clicking confirm just adds these
                coins to your balance locally.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={closeCoinModal}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirmCoinPurchase}>
                  Confirm Purchase
                </Button>
              </div>
            </div>
          ))}
      </Modal>
    </div>
  );
}
