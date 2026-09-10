import type { PromotionMethod } from "@/lib/types";

/**
 * How many Lootza Coins equal $1 of ad credit. Deliberately steeper than the coin
 * shop's earn/spend rate elsewhere in the app so coins farmed from challenges and
 * XP rewards can't be turned into large amounts of free advertising.
 */
export const COINS_PER_USD = 200;

export const MIN_AD_SPEND_USD = 5;

export interface AdCoinTier {
  coins: number;
  usd: number;
}

/** Fixed coin amounts sellers can choose as a daily ad budget — every tier clears the $5 minimum, so nothing below it is ever shown. */
export const AD_COIN_TIERS: AdCoinTier[] = [
  { coins: 1000, usd: 5 },
  { coins: 2000, usd: 10 },
  { coins: 5000, usd: 25 },
  { coins: 10000, usd: 50 },
  { coins: 20000, usd: 100 },
];

export const AD_DURATIONS_DAYS = [3, 7, 14, 30];

export function adSpendToUsd(method: PromotionMethod, amount: number): number {
  return method === "cash" ? amount : amount / COINS_PER_USD;
}

export interface AdReachEstimate {
  views: number;
  clicks: number;
  sales: number;
}

/**
 * Pure function of budget only (no randomness) so the live preview in the promote
 * form updates smoothly as the seller drags budget/duration. A mild efficiency
 * curve rewards bigger budgets with a better views-per-dollar rate, on top of the
 * already-large linear scaling — so a $200 campaign looks dramatically bigger
 * than a $5 one, not just proportionally bigger.
 */
export function estimateAdReach(budgetUsd: number): AdReachEstimate {
  if (budgetUsd <= 0) return { views: 0, clicks: 0, sales: 0 };
  const baseViewsPerDollar = 220;
  const efficiency = 1 + Math.min(Math.log10(budgetUsd + 1) * 0.18, 0.75);
  const views = Math.round(budgetUsd * baseViewsPerDollar * efficiency);
  const clicks = Math.round(views * 0.032);
  const sales = Math.round(clicks * 0.05);
  return { views, clicks, sales };
}
