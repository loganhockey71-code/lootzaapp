"use client";

import { Package } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CollectibleCard } from "@/components/product/CollectibleCard";
import { useAppState } from "@/lib/state/AppStateContext";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { calculateRarity } from "@/lib/rarity";

export default function CollectionPage() {
  const { collection, purchases } = useAppState();
  const allProducts = useAllProducts();

  // Merged so real purchases (persisted in Supabase — survive refresh, logout,
  // and a different browser/device) and the older local-only mock collection
  // both show up here, deduped by product id.
  const ownedEntries = new Map<string, string>();
  for (const entry of collection) {
    if (!ownedEntries.has(entry.productId)) ownedEntries.set(entry.productId, entry.purchasedAt);
  }
  for (const p of purchases) {
    // A refunded purchase no longer counts as owned — the underlying Stripe
    // charge was reversed, so it shouldn't still show up as a collectible.
    if (p.status !== "completed") continue;
    if (!ownedEntries.has(p.productId)) ownedEntries.set(p.productId, p.createdAt);
  }

  const items = [...ownedEntries.entries()]
    .map(([productId, purchasedAt]) => ({ purchasedAt, product: allProducts.find((p) => p.id === productId) }))
    .filter((x): x is { purchasedAt: string; product: NonNullable<(typeof x)["product"]> } => !!x.product)
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());

  const rarityCounts = items.reduce<Record<string, number>>((acc, { product }) => {
    const rarity = calculateRarity(product, allProducts);
    acc[rarity] = (acc[rarity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        icon={Package}
        title="My Collection"
        subtitle={`${items.length} digital collectible${items.length === 1 ? "" : "s"} you own.`}
      />

      {items.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {(["legendary", "epic", "rare", "uncommon", "common"] as const).map(
            (r) =>
              rarityCounts[r] && (
                <span key={r} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold capitalize text-ink-soft ring-1 ring-border">
                  {r}: {rarityCounts[r]}
                </span>
              )
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Your collection is empty"
          body="Buy a product to start your collection. Every drop shows up here like a collectible."
          actionLabel="Discover products"
          actionHref="/discover"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map(({ product, purchasedAt }) => (
            <CollectibleCard key={product.id} product={product} purchasedAt={purchasedAt} />
          ))}
        </div>
      )}
    </div>
  );
}
