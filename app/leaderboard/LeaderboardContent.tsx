"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Trophy, Gift, Coins, Award, ArrowUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { useAppState } from "@/lib/state/AppStateContext";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import {
  LEADERBOARD_PERIODS,
  MIN_PARTICIPANTS_FOR_REWARDS,
  WEEKLY_REWARD_TIERS,
  currentUserPeriodXp,
  getCreatorsLeaderboard,
  getCollectorsLeaderboard,
  getProductsLeaderboard,
  rewardForRank,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardResult,
} from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

const CATEGORY_TABS: { id: LeaderboardCategory; label: string }[] = [
  { id: "creators", label: "Creators" },
  { id: "collectors", label: "Collectors" },
  { id: "products", label: "Products" },
];

function RankBadge({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? "bg-accent-500 text-white" // gold
      : rank === 2
        ? "bg-gray-400 text-white" // silver
        : rank === 3
          ? "bg-amber-700 text-white" // bronze
          : "bg-surface-2 text-ink-soft";
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", tone)}>
      {rank}
    </span>
  );
}

const REWARD_TIER_CLASSES: Record<string, string> = {
  "#1": "bg-accent-50 text-accent-700",
  "#2": "bg-gray-100 text-gray-600",
  "#3": "bg-amber-50 text-amber-800",
};

function EntryRow({ entry, category }: { entry: LeaderboardEntry; category: LeaderboardCategory }) {
  const href =
    category === "products" ? (entry.slug ? `/product/${entry.slug}` : null) : entry.handle ? `/@${entry.handle}` : null;

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
        entry.isCurrentUser
          ? "border-ink/15 bg-surface-2"
          : "border-border bg-surface hover:bg-surface-2"
      )}
    >
      <RankBadge rank={entry.rank} />
      <CreatorAvatar name={entry.name} seed={entry.avatarSeed} avatarUrl={entry.avatarUrl} size={32} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
          {entry.name}
          {entry.isCurrentUser && (
            <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white">You</span>
          )}
        </p>
        <p className="truncate text-xs text-ink-soft">{entry.meta}</p>
      </div>
      <span className={cn("shrink-0 text-sm font-bold", category === "collectors" ? "text-primary-600" : "text-ink")}>
        {entry.scoreLabel}
      </span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function LeaderboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Note: promotion/ad data is intentionally never read here. Buying ads must not affect rank.
  const { xp, xpTxns, level, claimedWeeklyLeaderboardReward, claimWeeklyLeaderboardReward, user, profile, getCreator } =
    useAppState();
  const allProducts = useAllProducts();

  const [category, setCategory] = useState<LeaderboardCategory>(
    (searchParams.get("category") as LeaderboardCategory) ?? "creators"
  );
  const [period, setPeriod] = useState<LeaderboardPeriod>(
    (searchParams.get("period") as LeaderboardPeriod) ?? "weekly"
  );
  const [claimError, setClaimError] = useState<string | null>(null);

  function updateCategory(id: string) {
    setCategory(id as LeaderboardCategory);
    router.replace(`/leaderboard?category=${id}&period=${period}`, { scroll: false });
  }

  function updatePeriod(id: string) {
    setPeriod(id as LeaderboardPeriod);
    router.replace(`/leaderboard?category=${category}&period=${id}`, { scroll: false });
  }

  // Always the signed-in account's own identity, never a fixed demo user.
  const userId = user?.id ?? null;
  const handle = profile?.username ?? user?.username ?? "";
  const displayName = profile?.displayName?.trim() || handle;
  const avatarUrl = profile?.avatarUrl ?? null;

  const board: LeaderboardResult = useMemo(() => {
    if (category === "creators") return getCreatorsLeaderboard(allProducts, getCreator, userId);
    if (category === "products") return getProductsLeaderboard(allProducts, userId);
    const periodXp = currentUserPeriodXp(xpTxns, xp, period);
    return getCollectorsLeaderboard(periodXp, {
      id: userId ?? "guest",
      name: displayName,
      avatarSeed: userId ?? "guest",
      avatarUrl,
      handle,
      level,
    });
  }, [category, period, allProducts, getCreator, userId, xpTxns, xp, level, displayName, avatarUrl, handle]);

  // Reward eligibility is always based on the WEEKLY board for creators/collectors,
  // regardless of which period tab is currently being viewed.
  const weeklyRewardBoard: LeaderboardResult | null = useMemo(() => {
    if (category === "products") return null;
    if (category === "creators") return getCreatorsLeaderboard(allProducts, getCreator, userId);
    const weeklyXp = currentUserPeriodXp(xpTxns, xp, "weekly");
    return getCollectorsLeaderboard(weeklyXp, {
      id: userId ?? "guest",
      name: displayName,
      avatarSeed: userId ?? "guest",
      avatarUrl,
      handle,
      level,
    });
  }, [category, allProducts, getCreator, userId, xpTxns, xp, level, displayName, avatarUrl, handle]);

  const myWeeklyRank = weeklyRewardBoard?.currentUserEntry?.rank ?? null;
  const rewardsUnlocked = (weeklyRewardBoard?.totalParticipants ?? 0) >= MIN_PARTICIPANTS_FOR_REWARDS;
  const myReward = myWeeklyRank && rewardsUnlocked ? rewardForRank(myWeeklyRank) : null;

  function handleClaim() {
    if (!myReward) return;
    const result = claimWeeklyLeaderboardReward(myReward);
    setClaimError(result.ok ? null : result.error);
  }

  const { top, currentUserEntry, nextEntry } = board;
  const scoreUnit = category === "collectors" ? "XP" : "pts";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        icon={Trophy}
        title="Leaderboard"
        subtitle="See how you stack up against creators, collectors, and top products."
      />

      <Tabs tabs={CATEGORY_TABS} activeId={category} onChange={updateCategory} className="mb-3" />
      <Tabs
        tabs={LEADERBOARD_PERIODS.map((p) => ({ id: p.id, label: p.label }))}
        activeId={period}
        onChange={updatePeriod}
        className="mb-6"
      />
      {category !== "collectors" && (
        <p className="-mt-3 mb-6 text-xs text-ink-soft">
          Creator and product rankings use lifetime sales, so they look the same for every period.
        </p>
      )}

      <div className="mb-6 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink">
          <Gift size={15} className="text-ink-soft" aria-hidden /> Weekly Rewards
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {WEEKLY_REWARD_TIERS.map((tier) => (
            <div key={tier.rank} className={cn("rounded-xl p-2.5 text-center", REWARD_TIER_CLASSES[tier.rank] ?? "bg-surface-2 text-ink-soft")}>
              <p className="text-xs font-bold">{tier.rank}</p>
              <p className="mt-0.5 text-[11px] text-ink-soft">{tier.reward}</p>
            </div>
          ))}
        </div>

        {weeklyRewardBoard && !rewardsUnlocked && (
          <p className="mt-3 text-xs text-ink-soft">
            Rewards unlock once at least {MIN_PARTICIPANTS_FOR_REWARDS} people are ranked.
          </p>
        )}

        {myReward && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent-50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-700">
              <Award size={15} aria-hidden /> You qualify: {myReward.label}
            </p>
            <Button
              size="sm"
              variant={claimedWeeklyLeaderboardReward ? "outline" : "primary"}
              disabled={claimedWeeklyLeaderboardReward}
              onClick={handleClaim}
              className="gap-1.5"
            >
              {claimedWeeklyLeaderboardReward ? (
                "Claimed"
              ) : (
                <>
                  <Coins size={13} aria-hidden /> Claim
                </>
              )}
            </Button>
          </div>
        )}
        {claimError && <p className="mt-2 text-xs font-medium text-red-600">{claimError}</p>}
      </div>

      {currentUserEntry && (
        <div className="mb-6 rounded-2xl border border-border bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
              <ArrowUp size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-extrabold text-ink">
                {category === "products" ? "Your top product is " : "You're "}#{currentUserEntry.rank}
                {nextEntry
                  ? `, ${(nextEntry.score - currentUserEntry.score).toLocaleString()} ${scoreUnit} away from #${nextEntry.rank}.`
                  : currentUserEntry.rank === 1
                    ? ". You're in the lead!"
                    : "."}
              </p>
              <p className="text-xs text-ink-soft">
                Out of {board.totalParticipants.toLocaleString()} ranked{category === "collectors" ? ` this ${period === "all-time" ? "period" : period}` : ""}.
              </p>
            </div>
          </div>
        </div>
      )}
      {!currentUserEntry && category === "products" && (
        <p className="mb-6 text-sm text-ink-soft">List a product to appear on this board.</p>
      )}

      <div className="flex flex-col gap-2">
        {top.map((entry) => (
          <EntryRow key={entry.id} entry={entry} category={category} />
        ))}
      </div>
    </div>
  );
}
