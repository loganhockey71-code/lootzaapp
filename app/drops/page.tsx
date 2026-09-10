import { Suspense } from "react";
import { DropsContent } from "./DropsContent";

function DropsFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 h-8 w-48 animate-shimmer rounded-lg bg-surface-2" />
      <div className="animate-shimmer mb-10 aspect-[2/1] w-full rounded-3xl bg-surface-2 md:aspect-[3/1]" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-shimmer aspect-[4/3] rounded-2xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

export default function DropsPage() {
  return (
    <Suspense fallback={<DropsFallback />}>
      <DropsContent />
    </Suspense>
  );
}
