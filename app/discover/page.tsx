import { Suspense } from "react";
import { DiscoverContent } from "./DiscoverContent";

function DiscoverFallback() {
  return (
    <div className="mx-auto h-[calc(100dvh-134px)] w-full max-w-md md:h-[calc(100dvh-64px)] md:max-w-[440px] md:py-4">
      <div className="relative flex h-full w-full flex-col gap-3 overflow-hidden bg-ink p-3 sm:p-4 md:rounded-3xl">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-20 shrink-0 animate-shimmer rounded-full bg-gradient-to-r from-white/5 via-white/15 to-white/5" />
          ))}
        </div>
        <div className="animate-shimmer h-full w-full rounded-2xl bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverFallback />}>
      <DiscoverContent />
    </Suspense>
  );
}
