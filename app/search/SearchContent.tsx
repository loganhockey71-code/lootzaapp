"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Compass, Gift, Search, SearchX, BadgeCheck } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { creators } from "@/lib/data/creators";
import { feedPosts } from "@/lib/data/feedPosts";
import { categories } from "@/lib/data/categories";
import { useAppState } from "@/lib/state/AppStateContext";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { formatCompactNumber } from "@/lib/utils";

export function SearchContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const categorySlug = searchParams.get("category") ?? "all";
  const allProducts = useAllProducts();
  const { posts: userPosts } = useAppState();

  const isHashtag = query.startsWith("#");
  const q = query.toLowerCase();

  let matchProducts = allProducts;
  if (categorySlug !== "all") matchProducts = matchProducts.filter((p) => p.category === categorySlug);
  if (q) matchProducts = matchProducts.filter((p) => `${p.title} ${p.tagline}`.toLowerCase().includes(q));

  const matchCreators =
    q && !isHashtag ? creators.filter((c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)) : [];

  const matchPosts = isHashtag
    ? [...userPosts, ...feedPosts].filter((p) => p.caption.toLowerCase().includes(q))
    : [];

  const categoryName = categories.find((c) => c.slug === categorySlug)?.name;
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (categorySlug !== "all") params.set("category", categorySlug);
  const paramString = params.toString();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        icon={Search}
        title={query ? `Results for "${query}"` : categoryName ? `Browsing ${categoryName}` : "Search"}
        subtitle={
          categoryName && query ? `Filtered to ${categoryName}` : "Products, creators, and posts across Lootza"
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/discover${paramString ? `?${paramString}` : ""}`}
          className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink/20 hover:bg-surface-2"
        >
          <Compass size={16} aria-hidden /> Search in Discover
        </Link>
        <Link
          href={`/drops${paramString ? `?${paramString}` : ""}`}
          className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink/20 hover:bg-surface-2"
        >
          <Gift size={16} aria-hidden /> Search in Drops
        </Link>
      </div>

      {matchCreators.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display mb-3 text-lg font-bold text-ink">Creators</h2>
          <div className="flex flex-wrap gap-3">
            {matchCreators.map((c) => (
              <Link
                key={c.id}
                href={`/@${c.handle}`}
                className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-card transition-colors hover:border-ink/20"
              >
                <CreatorAvatar name={c.name} seed={c.avatarSeed} avatarUrl={c.avatar} size={32} />
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold text-ink">
                    {c.name}
                    {c.verified && <BadgeCheck size={13} className="text-blue-500" aria-hidden />}
                  </p>
                  <p className="text-xs text-ink-soft">{formatCompactNumber(c.followers)} followers</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isHashtag && (
        <div className="mb-8">
          <h2 className="font-display mb-3 text-lg font-bold text-ink">Posts tagged {query}</h2>
          {matchPosts.length === 0 ? (
            <p className="text-sm text-ink-soft">No posts use this hashtag yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {matchPosts.map((post) => {
                const creator = creators.find((c) => c.id === post.creatorId);
                if (!creator) return null;
                return (
                  <Link
                    key={post.id}
                    href={`/discover?q=${encodeURIComponent(query)}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card transition-colors hover:border-ink/20"
                  >
                    <CreatorAvatar name={creator.name} seed={creator.avatarSeed} avatarUrl={creator.avatar} size={32} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{creator.name}</p>
                      <p className="line-clamp-1 text-sm text-ink-soft">{post.caption}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      <h2 className="font-display mb-3 text-lg font-bold text-ink">Products</h2>
      {matchProducts.length === 0 ? (
        <EmptyState icon={SearchX} title="No products match" body="Try a different search term or category." />
      ) : (
        <ProductGrid products={matchProducts} />
      )}
    </div>
  );
}
