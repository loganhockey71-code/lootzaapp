"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BadgeCheck, Flame, Sparkles, Timer, Zap, SearchX } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductArtwork } from "@/components/product/ProductArtwork";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { Badge } from "@/components/ui/Badge";
import { CountdownTimer } from "@/components/product/CountdownTimer";
import { getCreatorById } from "@/lib/data/creators";
import { products } from "@/lib/data/products";
import { postedAtToMinutes, formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";

function DropSection({
  icon: Icon,
  title,
  subtitle,
  products: sectionProducts,
}: {
  icon: typeof Flame;
  title: string;
  subtitle: string;
  products: Product[];
}) {
  if (sectionProducts.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ink-soft">
          <Icon size={16} aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
          <p className="text-xs text-ink-soft">{subtitle}</p>
        </div>
      </div>
      <ProductGrid products={sectionProducts} />
    </section>
  );
}

export function DropsContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = searchParams.get("category") ?? "all";
  const searching = query.length > 0 || category !== "all";

  const filteredProducts = useMemo(() => {
    let list = products;
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (query) list = list.filter((p) => `${p.title} ${p.tagline}`.toLowerCase().includes(query));
    return list;
  }, [category, query]);

  const sorted = useMemo(
    () => [...filteredProducts].sort((a, b) => postedAtToMinutes(a.postedAt) - postedAtToMinutes(b.postedAt)),
    [filteredProducts]
  );
  const latest = sorted[0];
  const rest = sorted.slice(1);
  const latestCreator = latest ? getCreatorById(latest.creatorId) : null;

  const eventDrops = filteredProducts.filter((p) => p.drop?.tag === "event");
  const limitedDrops = filteredProducts.filter((p) => p.drop?.tag === "limited");
  const trending = rest.filter((p) => p.badge === "trending" || p.sold > 1000).sort((a, b) => b.sold - a.sold);
  const newReleases = rest.filter((p) => p.badge === "new");

  if (searching && filteredProducts.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Latest drops" subtitle="Fresh releases, limited runs, and live events, newest first." />
        <EmptyState icon={SearchX} title="No drops match" body="Try a different search term or category." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Latest drops"
        subtitle={
          searching
            ? `Filtered results${query ? ` for "${query}"` : ""}`
            : "Fresh releases, limited runs, and live events, newest first."
        }
      />

      {!searching && latest && latestCreator && (
        <Link
          href={`/product/${latest.slug}`}
          className="group mb-10 grid overflow-hidden rounded-3xl bg-surface shadow-card-hover ring-1 ring-border md:grid-cols-2"
        >
          <ProductArtwork
            product={latest}
            priority
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] md:aspect-auto md:h-full"
          />
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
            <div className="flex items-center gap-2">
              <Badge tone="new" />
              <span className="text-xs font-semibold text-ink-soft">{latest.postedAt}</span>
            </div>
            <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{latest.title}</h2>
            <p className="text-ink-soft">{latest.tagline}</p>
            {latest.drop && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                  {latest.drop.tag === "limited" ? "Limited" : "Event"}
                </span>
                <CountdownTimer endsAt={latest.drop.endsAt} className="text-red-600" />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <CreatorAvatar name={latestCreator.name} seed={latestCreator.avatarSeed} size={24} />
              <span className="font-semibold text-ink">{latestCreator.name}</span>
              {latestCreator.verified && <BadgeCheck size={16} className="text-blue-500" aria-hidden />}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-ink">{formatPrice(latest.price)}</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 transition-colors group-hover:text-primary-700">
                View Drop <ArrowRight size={14} aria-hidden />
              </span>
            </div>
          </div>
        </Link>
      )}

      <DropSection
        icon={Zap}
        title="Special events"
        subtitle="Time-limited event drops, grab them before the clock runs out."
        products={eventDrops}
      />
      <DropSection
        icon={Timer}
        title="Limited releases"
        subtitle="Small-batch drops with only a handful of units left."
        products={limitedDrops}
      />
      <DropSection
        icon={Flame}
        title="Trending now"
        subtitle="What the community is buying and saving the most right now."
        products={trending}
      />
      <DropSection
        icon={Sparkles}
        title="New releases"
        subtitle="Just dropped by creators you might not follow yet."
        products={newReleases}
      />

      <h2 className="font-display mb-4 text-lg font-extrabold text-ink">{searching ? "All matching drops" : "More drops"}</h2>
      <ProductGrid products={searching ? filteredProducts : rest} />
    </div>
  );
}
