import { applyXpGain } from "@/lib/leveling";
import { challenges } from "@/lib/data/challenges";
import type {
  AppNotification,
  ChallengeGoalType,
  ChallengeProgress,
  CoinReason,
  CoinTxn,
  CommentEntry,
  NotificationType,
  Review,
  XpReason,
  XpTxn,
} from "@/lib/types";

/**
 * Pure state-transform helpers shared by every AppState action that grants
 * XP/Coins, fires a notification, or bumps challenge progress. Kept outside
 * the component so each action can compose several of these in one
 * `setState` update without re-deriving the same logic inline.
 */

export interface RewardsShape {
  coins: number;
  coinTxns: CoinTxn[];
  level: number;
  xp: number;
  xpTxns: XpTxn[];
  notifications: AppNotification[];
  challengeProgress: Record<string, ChallengeProgress>;
  comments: CommentEntry[];
  userReviews: Record<string, Review[]>;
  ownedCosmetics: string[];
  equipped: { frame: string | null; background: string | null; title: string | null; effect: string | null };
  watchedIds: string[];
  clickedProductIds: string[];
  lastActiveDate: string | null;
  streakCount: number;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function pushNotification<S extends RewardsShape>(
  state: S,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): S {
  const notif: AppNotification = {
    id: makeId("notif"),
    type,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
    link,
  };
  return { ...state, notifications: [notif, ...state.notifications].slice(0, 60) };
}

export function grantCoins<S extends RewardsShape>(state: S, amount: number, reason: CoinReason, label: string): S {
  const txn: CoinTxn = { id: makeId("coin"), amount, reason, label, createdAt: new Date().toISOString() };
  let next: S = { ...state, coins: state.coins + amount, coinTxns: [txn, ...state.coinTxns].slice(0, 100) };
  if (amount > 0) {
    next = pushNotification(next, "coins", `+${amount} Lootza Coins`, label);
  }
  return next;
}

export function grantXp<S extends RewardsShape>(state: S, amount: number, reason: XpReason, label: string): S {
  const { level, xp, levelsGained } = applyXpGain(state.level, state.xp, amount);
  const txn: XpTxn = { id: makeId("xp"), amount, reason, label, createdAt: new Date().toISOString() };
  let next: S = { ...state, level, xp, xpTxns: [txn, ...state.xpTxns].slice(0, 100) };

  if (levelsGained > 0) {
    const bonus = levelsGained * 100;
    next = pushNotification(
      next,
      "level-up",
      `Level ${level}!`,
      `You leveled up${levelsGained > 1 ? ` ${levelsGained} times` : ""} and earned ${bonus} bonus coins.`
    );
    next = grantCoins(next, bonus, "level-up", `Level ${level} reward`);
  }

  return next;
}

/** Bumps progress toward every not-yet-completed challenge matching this goal type. */
export function bumpChallengeProgress<S extends RewardsShape>(
  state: S,
  goalType: ChallengeGoalType,
  amount = 1
): S {
  const matching = challenges.filter((c) => c.goalType === goalType);
  if (matching.length === 0) return state;

  const progress = { ...state.challengeProgress };
  for (const challenge of matching) {
    const existing = progress[challenge.id] ?? { count: 0, claimed: false, completedAt: null };
    if (existing.claimed) continue;
    const count = Math.min(challenge.goalCount, existing.count + amount);
    const justCompleted = count >= challenge.goalCount && !existing.completedAt;
    progress[challenge.id] = {
      count,
      claimed: existing.claimed,
      completedAt: justCompleted ? new Date().toISOString() : existing.completedAt,
    };
  }

  let next: S = { ...state, challengeProgress: progress };
  for (const challenge of matching) {
    const before = state.challengeProgress[challenge.id];
    const after = progress[challenge.id];
    if (after.completedAt && !before?.completedAt) {
      next = pushNotification(
        next,
        "achievement",
        "Challenge complete!",
        `"${challenge.title}" is ready to claim in Challenges.`,
        "/challenges"
      );
    }
  }
  return next;
}
