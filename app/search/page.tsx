import { Suspense } from "react";
import { SearchContent } from "./SearchContent";

function SearchFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 h-8 w-64 animate-shimmer rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-shimmer aspect-[4/3] rounded-2xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}
