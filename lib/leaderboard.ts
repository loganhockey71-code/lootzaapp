import type { Product } from "@/lib/types";
import { creators } from "@/lib/data/creators";
import { hashSeed, formatCompactNumber } from "@/lib/utils";

export type LeaderboardCategory = "creators" | "collectors" | "products";
export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "all-time";

export const LEADERBOARD_PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "all-time", label: "All Time" },
];

/** How much of a creator/product's lifetime totals are attributed to each rolling window — a simplifying stand-in for real per-day history. */
const PERIOD_FRACTION: Record<LeaderboardPeriod, number> = {
  daily: 0.015,
  weekly: 0.1,
  monthly: 0.35,
  "all-time": 1,
};

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatarSeed: string;
  score: number;
  scoreLabel: string;
  meta: string;
  isCurrentUser: boolean;
  isSynthetic: boolean;
  handle?: string;
  slug?: string;
  /** Consecutive weeks (mocked) spent in the Top 10 — only meaningful when >= 2. */
  topTenStreak: number;
}

export interface LeaderboardResult {
  top: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  /** The entry ranked directly above the current user — used for the "N away from #rank" callout. */
  nextEntry: LeaderboardEntry | null;
  totalParticipants: number;
}

// ---------------------------------------------------------------------------
// Deterministic mock-name generators. Every list is fixed and every synthetic
// entry's identity/score comes from hashing a stable seed string, so re-running
// the same period/category always produces the same board.
// ---------------------------------------------------------------------------

const STUDIO_PREFIX = [
  "Nova",
  "Pixel",
  "Retro",
  "Neon",
  "Cosmic",
  "Glitch",
  "Aero",
  "Lunar",
  "Vivid",
  "Frost",
  "Ember",
  "Quartz",
  "Vapor",
  "Circuit",
  "Prism",
  "Drift",
  "Nimbus",
  "Solar",
  "Echo",
  "Rogue",
];
const STUDIO_SUFFIX = [
  "Studio",
  "Works",
  "Craft",
  "Forge",
  "Labs",
  "Design",
  "Made",
  "Wave",
  "Loop",
  "Sync",
  "Nest",
  "Hive",
  "Kit",
  "Press",
  "Point",
  "Field",
  "Line",
  "Core",
];

function syntheticStudioName(seed: string): string {
  const h = hashSeed(seed);
  return `${STUDIO_PREFIX[h % STUDIO_PREFIX.length]} ${STUDIO_SUFFIX[(h >> 4) % STUDIO_SUFFIX.length]}`;
}

const PERSON_ADJ = [
  "Swift",
  "Silent",
  "Golden",
  "Iron",
  "Crimson",
  "Arctic",
  "Mystic",
  "Turbo",
  "Lucky",
  "Shadow",
  "Vivid",
  "Cobalt",
  "Amber",
  "Rapid",
  "Wild",
];
const PERSON_NOUN = [
  "Fox",
  "Falcon",
  "Wolf",
  "Ranger",
  "Phoenix",
  "Ninja",
  "Voyager",
  "Nomad",
  "Hunter",
  "Sage",
  "Comet",
  "Otter",
  "Raven",
  "Pilot",
  "Scout",
];

function syntheticPersonName(seed: string): string {
  const h = hashSeed(seed);
  const num = 10 + (h % 89);
  return `${PERSON_ADJ[h % PERSON_ADJ.length]}${PERSON_NOUN[(h >> 4) % PERSON_NOUN.length]}${num}`;
}

const PRODUCT_ADJ = ["Neon", "Minimal", "Bold", "Retro", "Ultra", "Classic", "Modern", "Dynamic", "Elite", "Prime"];
const PRODUCT_NOUN = [
  "UI Kit",
  "Icon Pack",
  "Template",
  "Overlay Pack",
  "Preset Bundle",
  "Asset Pack",
  "Theme Kit",
  "Mockup Set",
  "Font Pack",
  "Widget Kit",
];

function syntheticProductName(seed: string): string {
  const h = hashSeed(seed);
  return `${PRODUCT_ADJ[h % PRODUCT_ADJ.length]} ${PRODUCT_NOUN[(h >> 4) % PRODUCT_NOUN.length]}`;
}

function jitter(seed: string, spread = 0.25): number {
  const h = hashSeed(seed);
  return 1 - spread + ((h % 1000) / 1000) * spread * 2;
}

function streakFor(seed: string): number {
  return hashSeed(`streak-${seed}`) % 7;
}

/** Descending power-law curve: rank 1 sits at `baseline`, lower ranks fall off smoothly. */
function rankScore(baseline: number, rank: number, curve = 0.55): number {
  return baseline * Math.pow(100 / rank, curve);
}

type Candidate = Omit<LeaderboardEntry, "rank" | "topTenStreak" | "scoreLabel"> & { scoreLabel: string };

const POOL_TARGET = 400;

function finalize(candidates: Candidate[]): LeaderboardResult {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const ranked: LeaderboardEntry[] = sorted.map((c, i) => ({
    ...c,
    rank: i + 1,
    topTenStreak: i < 10 ? streakFor(c.id) : 0,
  }));
  const top = ranked.slice(0, 100);
  const currentUserEntry = ranked.find((e) => e.isCurrentUser) ?? null;
  const nextEntry = currentUserEntry && currentUserEntry.rank > 1 ? ranked[currentUserEntry.rank - 2] : null;
  return { top, currentUserEntry, nextEntry, totalParticipants: ranked.length };
}

// ---------------------------------------------------------------------------
// Creators — ranked on organic sales, saves, ratings, downloads, and review
// engagement. Ad/promotion metrics are never read here on purpose: buying ads
// must not directly move anyone's leaderboard rank.
// ---------------------------------------------------------------------------

const TOP_CREATOR_SCORE: Record<LeaderboardPeriod, number> = {
  daily: 900,
  weekly: 5200,
  monthly: 16500,
  "all-time": 48000,
};

export function getCreatorsLeaderboard(period: LeaderboardPeriod, allProducts: Product[]): LeaderboardResult {
  const fraction = PERIOD_FRACTION[period];
  const byCreator = new Map<string, Product[]>();
  for (const p of allProducts) {
    const list = byCreator.get(p.creatorId) ?? [];
    list.push(p);
    byCreator.set(p.creatorId, list);
  }

  const realCandidates: Candidate[] = creators.map((c) => {
    const list = byCreator.get(c.id) ?? [];
    const sales = list.reduce((sum, p) => sum + p.sold, 0);
    const saves = list.reduce(
      (sum, p) => sum + Math.round(p.likes * (0.25 + (hashSeed(`save-${p.id}`) % 30) / 100)),
      0
    );
    const reviewCount = list.reduce((sum, p) => sum + p.reviewCount, 0);
    const ratingWeighted = list.reduce((sum, p) => sum + p.rating * p.reviewCount, 0);
    const avgRating = reviewCount > 0 ? ratingWeighted / reviewCount : 0;

    const periodSales = Math.round(sales * fraction);
    const periodSaves = Math.round(saves * fraction);
    const periodReviews = Math.round(reviewCount * fraction);
    const score = Math.round(periodSales * 12 + periodSaves * 3 + avgRating * 150 + periodReviews * 8);

    return {
      id: c.id,
      name: c.name,
      avatarSeed: c.avatarSeed,
      score,
      scoreLabel: `${formatCompactNumber(score)} pts`,
      meta: `${formatCompactNumber(periodSales)} sales · ${avgRating > 0 ? avgRating.toFixed(1) : "—"}★ · ${formatCompactNumber(periodSaves)} saves`,
      isCurrentUser: c.id === "pixelmax",
      isSynthetic: false,
      handle: c.handle,
    };
  });

  const syntheticCount = Math.max(0, POOL_TARGET - realCandidates.length);
  const baseline = TOP_CREATOR_SCORE[period];
  const syntheticCandidates: Candidate[] = Array.from({ length: syntheticCount }, (_, i) => {
    const rank = i + realCandidates.length + 1;
    const seed = `creator-filler-${period}-${i}`;
    const score = Math.max(1, Math.round(rankScore(baseline, rank) * jitter(seed)));
    const rating = 3.8 + (hashSeed(seed) % 12) / 10;
    const sales = Math.round(score * 0.06);
    return {
      id: seed,
      name: syntheticStudioName(seed),
      avatarSeed: seed,
      score,
      scoreLabel: `${formatCompactNumber(score)} pts`,
      meta: `${formatCompactNumber(sales)} sales · ${rating.toFixed(1)}★`,
      isCurrentUser: false,
      isSynthetic: true,
    };
  });

  return finalize([...realCandidates, ...syntheticCandidates]);
}

// ---------------------------------------------------------------------------
// Collectors — ranked purely on XP earned during the period. The current
// user's XP is real (summed from their actual XP transactions/total); every
// other collector is a synthetic filler entry.
// ---------------------------------------------------------------------------

const TOP_XP_BY_PERIOD: Record<LeaderboardPeriod, number> = {
  daily: 900,
  weekly: 4200,
  monthly: 14000,
  "all-time": 90000,
};

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
  period: LeaderboardPeriod,
  currentUserXp: number,
  currentUser: { id: string; name: string; avatarSeed: string; handle: string; level: number }
): LeaderboardResult {
  const baseline = TOP_XP_BY_PERIOD[period];
  const syntheticCandidates: Candidate[] = Array.from({ length: POOL_TARGET - 1 }, (_, i) => {
    const rank = i + 2;
    const seed = `collector-${period}-${i}`;
    const score = Math.max(1, Math.round(rankScore(baseline, rank) * jitter(seed, 0.2)));
    return {
      id: seed,
      name: syntheticPersonName(seed),
      avatarSeed: seed,
      score,
      scoreLabel: `${formatCompactNumber(score)} XP`,
      meta: `Level ${Math.max(1, Math.round(score / 1200))}`,
      isCurrentUser: false,
      isSynthetic: true,
    };
  });

  const userCandidate: Candidate = {
    id: currentUser.id,
    name: currentUser.name,
    avatarSeed: currentUser.avatarSeed,
    score: Math.round(currentUserXp),
    scoreLabel: `${formatCompactNumber(Math.round(currentUserXp))} XP`,
    meta: `Level ${currentUser.level}`,
    isCurrentUser: true,
    isSynthetic: false,
    handle: currentUser.handle,
  };

  return finalize([userCandidate, ...syntheticCandidates]);
}

// ---------------------------------------------------------------------------
// Products — ranked on organic purchases, saves, ratings, and recent review
// engagement. Same rule as creators: promotion/ad stats never factor in.
// ---------------------------------------------------------------------------

const TOP_PRODUCT_SCORE: Record<LeaderboardPeriod, number> = {
  daily: 300,
  weekly: 1900,
  monthly: 6200,
  "all-time": 21000,
};

export function getProductsLeaderboard(
  period: LeaderboardPeriod,
  allProducts: Product[],
  currentUserId: string
): LeaderboardResult {
  const fraction = PERIOD_FRACTION[period];
  const realCandidates: Candidate[] = allProducts.map((p) => {
    const periodSold = Math.round(p.sold * fraction);
    const periodLikes = Math.round(p.likes * fraction);
    const periodReviews = Math.round(p.reviewCount * fraction);
    const score = Math.round(periodSold * 14 + periodLikes * 2 + p.rating * 120 + periodReviews * 6);
    return {
      id: p.id,
      name: p.title,
      avatarSeed: p.coverSeed,
      score,
      scoreLabel: `${formatCompactNumber(score)} pts`,
      meta: `${formatCompactNumber(periodSold)} sales · ${p.rating > 0 ? p.rating.toFixed(1) : "—"}★ · ${formatCompactNumber(periodLikes)} saves`,
      isCurrentUser: p.creatorId === currentUserId,
      isSynthetic: false,
      slug: p.slug,
    };
  });

  const syntheticCount = Math.max(0, POOL_TARGET - realCandidates.length);
  const baseline = TOP_PRODUCT_SCORE[period];
  const syntheticCandidates: Candidate[] = Array.from({ length: syntheticCount }, (_, i) => {
    const rank = i + realCandidates.length + 1;
    const seed = `product-filler-${period}-${i}`;
    const score = Math.max(1, Math.round(rankScore(baseline, rank) * jitter(seed)));
    const rating = 3.8 + (hashSeed(seed) % 12) / 10;
    const sales = Math.round(score * 0.07);
    return {
      id: seed,
      name: syntheticProductName(seed),
      avatarSeed: seed,
      score,
      scoreLabel: `${formatCompactNumber(score)} pts`,
      meta: `${formatCompactNumber(sales)} sales · ${rating.toFixed(1)}★`,
      isCurrentUser: false,
      isSynthetic: true,
    };
  });

  return finalize([...realCandidates, ...syntheticCandidates]);
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
