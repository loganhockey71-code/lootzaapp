"use client";

import { ListChecks, Coins, Zap, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { challenges } from "@/lib/data/challenges";
import { useAppState } from "@/lib/state/AppStateContext";
import { CHALLENGE_GOAL_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

function ChallengeRow({ challengeId }: { challengeId: string }) {
  const { challengeProgress, claimChallenge } = useAppState();
  const challenge = challenges.find((c) => c.id === challengeId)!;
  const progress = challengeProgress[challengeId] ?? { count: 0, claimed: false, completedAt: null };
  const Icon = CHALLENGE_GOAL_ICONS[challenge.goalType];
  const pct = Math.min(100, Math.round((progress.count / challenge.goalCount) * 100));
  const complete = progress.count >= challenge.goalCount;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          progress.claimed ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
        )}
      >
        {progress.claimed ? <Check size={20} aria-hidden /> : <Icon size={20} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{challenge.title}</p>
        <p className="text-sm text-ink-soft">{challenge.description}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn("h-full rounded-full", progress.claimed ? "bg-emerald-500" : "bg-blue-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-soft">
          <span>
            {progress.count}/{challenge.goalCount}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary-600">
            <Zap size={11} aria-hidden /> {challenge.rewardXp} XP
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-accent-600">
            <Coins size={11} aria-hidden /> {challenge.rewardCoins}
          </span>
        </div>
      </div>
      <Button
        size="sm"
        variant={progress.claimed || !complete ? "outline" : "primary"}
        disabled={progress.claimed || !complete}
        onClick={() => claimChallenge(challengeId)}
        className="shrink-0"
      >
        {progress.claimed ? "Claimed" : complete ? "Claim" : "In Progress"}
      </Button>
    </div>
  );
}

export default function ChallengesPage() {
  const daily = challenges.filter((c) => c.scope === "daily");
  const weekly = challenges.filter((c) => c.scope === "weekly");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        icon={ListChecks}
        title="Challenges"
        subtitle="Complete challenges to earn XP and Lootza Coins."
      />

      <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">Daily</h2>
      <div className="mb-8 flex flex-col gap-3">
        {daily.map((c) => (
          <ChallengeRow key={c.id} challengeId={c.id} />
        ))}
      </div>

      <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">Weekly</h2>
      <div className="flex flex-col gap-3">
        {weekly.map((c) => (
          <ChallengeRow key={c.id} challengeId={c.id} />
        ))}
      </div>
    </div>
  );
}
