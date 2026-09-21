import type { Creator, Product } from "@/lib/types";
import { formatCompactNumber } from "@/lib/utils";

export type LeaderboardCategory = "creators" | "collectors" | "products";
export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "all-time";

export const LEADERBOARD_PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "all-time", label: "All Time" },
];

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatarSeed: string;
  avatarUrl?: string | null;
  score: number;
  scoreLabel: string;
  meta: string;
  isCurrentUser: boolean;
  handle?: string;
  slug?: string;
}

export interface LeaderboardResult {
  top: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  /** The entry ranked directly above the current user — used for the "N away from #rank" callout. */
  nextEntry: LeaderboardEntry | null;
  totalParticipants: number;
}

// Every entry on these boards is a real account or a real listing. Nothing is
// generated to pad the list: with few users the board is short, and that's accurate.

type Candidate = Omit<LeaderboardEntry, "rank">;

function finalize(candidates: Candidate[]): LeaderboardResult {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const ranked: LeaderboardEntry[] = sorted.map((c, i) => ({ ...c, rank: i + 1 }));
  const top = ranked.slice(0, 100);
  const currentUserEntry = ranked.find((e) => e.isCurrentUser) ?? null;
  const nextEntry = currentUserEntry && currentUserEntry.rank > 1 ? ranked[currentUserEntry.rank - 2] : null;
  return { top, currentUserEntry, nextEntry, totalParticipants: ranked.length };
}

// ---------------------------------------------------------------------------
// Creators — ranked on real (Stripe-backed) sales. Ad/promotion metrics are never
// read here on purpose: buying ads must not directly move anyone's leaderboard rank.
// Sales are lifetime totals: there is no per-day sales history readable across
// accounts, so every period shows the same lifetime ranking.
// ---------------------------------------------------------------------------

export function getCreatorsLeaderboard(
  allProducts: Product[],
  creatorsById: (id: string) => Creator | undefined,
  currentUserId: string | null
): LeaderboardResult {
  const byCreator = new Map<string, Product[]>();
  for (const p of allProducts) {
    const list = byCreator.get(p.creatorId) ?? [];
    list.push(p);
    byCreator.set(p.creatorId, list);
  }

  const candidates: Candidate[] = [...byCreator.entries()].map(([creatorId, list]) => {
    const creator = creatorsById(creatorId);
    const sales = list.reduce((sum, p) => sum + p.sold, 0);
    const score = sales * 12 + list.length;
    return {
      id: creatorId,
      name: creator?.name ?? "Creator",
      avatarSeed: creator?.avatarSeed ?? creatorId,
      avatarUrl: creator?.avatar ?? null,
      score,
      scoreLabel: `${formatCompactNumber(score)} pts`,
      meta: `${formatCompactNumber(sales)} sales · ${list.length} product${list.length === 1 ? "" : "s"}`,
      isCurrentUser: creatorId === currentUserId,
      handle: creator?.handle ?? creatorId,
    };
  });

  return finalize(candidates);
}

// ---------------------------------------------------------------------------
// Collectors — ranked purely on XP earned during the period. The only collector
// whose XP this browser can know is the signed-in user's own (summed from their
// real XP transactions/total), so the board contains just them.
// ---------------------------------------------------------------------------

export function currentUserPeriodXp(
  xpTxns: { amount: number; createdAt: string }[],
  totalXp: number,
  period: LeaderboardPeriod
): number {
  if (period === "all-time") return totalXp;
  const windowMs = { daily: 86_400_000, weekly: 7 * 86_400_000, monthly: 30 * 86_400_000 }[period];
  const now = Date.now();
  return xpTxns
    .filter((t) => t.amount > 0 && now - new Date(t.createdAt).getTime() <= windowMs)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getCollectorsLeaderboard(
  currentUserXp: number,
  currentUser: { id: string; name: string; avatarSeed: string; avatarUrl?: string | null; handle: string; level: number }
): LeaderboardResult {
  return finalize([
    {
      id: currentUser.id,
      name: currentUser.name,
      avatarSeed: currentUser.avatarSeed,
      avatarUrl: currentUser.avatarUrl ?? null,
      score: Math.round(currentUserXp),
      scoreLabel: `${formatCompactNumber(Math.round(currentUserXp))} XP`,
      meta: `Level ${currentUser.level}`,
      isCurrentUser: true,
      handle: currentUser.handle,
    },
  ]);
}

// ---------------------------------------------------------------------------
// Products — ranked on real purchases. Same rule as creators: promotion/ad
// stats never factor in, and sales are lifetime totals.
// ---------------------------------------------------------------------------

export function getProductsLeaderboard(allProducts: Product[], currentUserId: string | null): LeaderboardResult {
  const candidates: Candidate[] = allProducts.map((p) => {
    const score = p.sold * 14;
    return {
      id: p.id,
      name: p.title,
      avatarSeed: p.coverSeed,
      score,
      scoreLabel: `${formatCompactNumber(score)} pts`,
      meta: `${formatCompactNumber(p.sold)} sales`,
      isCurrentUser: !!currentUserId && p.sellerId === currentUserId,
      slug: p.slug,
    };
  });
  return finalize(candidates);
}

// ---------------------------------------------------------------------------
// Weekly rewards
// ---------------------------------------------------------------------------

export interface LeaderboardReward {
  coins: number;
  badge: string | null;
  bonusXp: number;
  label: string;
}

/**
 * Rewards only unlock once this many real people are ranked. With a handful of users,
 * "rank #1" is trivially reachable and would just be free coins.
 */
export const MIN_PARTICIPANTS_FOR_REWARDS = 10;

export const WEEKLY_REWARD_TIERS: { rank: string; reward: string }[] = [
  { rank: "#1", reward: "1,000 Coins + exclusive badge" },
  { rank: "#2", reward: "600 Coins" },
  { rank: "#3", reward: "350 Coins" },
  { rank: "Top 10", reward: "Exclusive badge" },
  { rank: "Top 100", reward: "Bonus XP" },
];

export function rewardForRank(rank: number): LeaderboardReward | null {
  if (rank === 1) return { coins: 1000, badge: "Weekly Champion", bonusXp: 0, label: "#1 — 1,000 Coins + exclusive badge" };
  if (rank === 2) return { coins: 600, badge: null, bonusXp: 0, label: "#2 — 600 Coins" };
  if (rank === 3) return { coins: 350, badge: null, bonusXp: 0, label: "#3 — 350 Coins" };
  if (rank <= 10) return { coins: 0, badge: "Top 10 Finisher", bonusXp: 0, label: "Top 10 — exclusive badge" };
  if (rank <= 100) return { coins: 0, badge: null, bonusXp: 150, label: "Top 100 — bonus XP" };
  return null;
}
