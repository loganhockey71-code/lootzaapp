import type { Product, Rarity } from "@/lib/types";

/**
 * Placeholder for a future backend rarity engine.
 *
 * Sellers never choose a rarity — it's derived from how a product compares to
 * the rest of the marketplace. The real version of this would group products
 * by topic/similarity (e.g. "products about cookies") and weigh demand and
 * freshness; this mock stands in with `category` as the topic proxy and a
 * quality signal (rating + engagement) to rank peers within it. Percentile
 * cutoffs (not fixed counts) mean the tiers keep the same rough shape whether
 * the catalog has 18 products or 100,000 — a saturated category naturally
 * pushes most of its products toward Common, while a handful of standouts
 * stay rare.
 */

const PERCENTILE_CUTOFFS: Record<Rarity, number> = {
  legendary: 0.08,
  epic: 0.35,
  rare: 0.6,
  uncommon: 0.85,
  common: 1,
};

const RARITY_ORDER: Rarity[] = ["legendary", "epic", "rare", "uncommon", "common"];

function qualitySignal(product: Product): number {
  return product.rating * Math.log2(product.likes + 2);
}

function scarcityScore(product: Product, allProducts: Product[]): number {
  const peers = allProducts.filter((p) => p.category === product.category);
  const categorySaturation = peers.length / allProducts.length;

  const ranked = [...peers].sort((a, b) => qualitySignal(b) - qualitySignal(a));
  const rank = ranked.findIndex((p) => p.id === product.id);

  // Lower is rarer: a small, unsaturated category keeps a low score even for
  // its best product; falling behind peers within a category raises it.
  return categorySaturation * (1 + Math.max(rank, 0) * 0.5);
}

/** Computes a product's rarity relative to the current marketplace snapshot. */
export function calculateRarity(product: Product, allProducts: Product[]): Rarity {
  if (allProducts.length <= 1) return "legendary";

  const target = scarcityScore(product, allProducts);
  const rarerOrEqualCount = allProducts.filter((p) => scarcityScore(p, allProducts) <= target).length;
  const percentile = rarerOrEqualCount / allProducts.length;

  return RARITY_ORDER.find((rarity) => percentile <= PERCENTILE_CUTOFFS[rarity]) ?? "common";
}
