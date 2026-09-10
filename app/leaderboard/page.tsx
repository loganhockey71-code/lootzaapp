import { Suspense } from "react";
import { LeaderboardContent } from "./LeaderboardContent";

function LeaderboardFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 h-8 w-48 animate-shimmer rounded-lg bg-gradient-to-r from-surface-2 via-border to-surface-2" />
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-shimmer rounded-full bg-gradient-to-r from-surface-2 via-border to-surface-2" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-shimmer h-16 w-full rounded-2xl bg-gradient-to-r from-surface-2 via-border to-surface-2" />
        ))}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LeaderboardFallback />}>
      <LeaderboardContent />
    </Suspense>
  );
}
