"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, TrendingUp, Gift, Users, SearchX, UserPlus, ChevronUp, ChevronDown, type LucideIcon } from "lucide-react";
import { ProductVideoCard } from "@/components/product/ProductVideoCard";
import { PostCard } from "@/components/feed/PostCard";
import { CATEGORY_ICONS } from "@/lib/icons";
import { feedPosts } from "@/lib/data/feedPosts";
import { categories } from "@/lib/data/categories";
import { getCreatorById } from "@/lib/data/creators";
import { useAppState } from "@/lib/state/AppStateContext";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { cn, postedAtToMinutes } from "@/lib/utils";
import type { TabItem } from "@/components/ui/Tabs";
import type { CategorySlug, FeedPost, Product } from "@/lib/types";

type FeedItem =
  | { kind: "product"; id: string; creatorId: string; category: CategorySlug; product: Product }
  | { kind: "post"; id: string; creatorId: string; category: CategorySlug | null; post: FeedPost };

const FEED_TABS: TabItem[] = [
  { id: "for-you", label: "For You", icon: Sparkles },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "newest", label: "New Drops", icon: Gift },
  { id: "following", label: "Following", icon: Users },
];

const CATEGORY_TABS: TabItem[] = [
  { id: "all", label: "All" },
  ...categories.map((c) => ({ id: c.slug, label: c.name, icon: CATEGORY_ICONS[c.slug] })),
];

function FilterPill({ tab, active, onClick }: { tab: TabItem; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur transition-all active:scale-95 sm:text-sm",
        active
          ? "border-white bg-white text-ink shadow-sm"
          : "border-white/30 bg-black/25 text-white hover:border-white/60"
      )}
    >
      {tab.icon && <tab.icon size={13} aria-hidden />}
      {tab.label}
    </button>
  );
}

function isTrending(item: FeedItem): boolean {
  if (item.kind === "product") return item.product.badge === "trending" || item.product.sold > 1000;
  return item.post.likes > 150;
}

function postedAtMinutes(item: FeedItem): number {
  return postedAtToMinutes(item.kind === "product" ? item.product.postedAt : item.post.postedAt);
}

function itemId(item: FeedItem): string {
  return item.kind === "product" ? item.product.id : item.post.id;
}

function likesOf(item: FeedItem): number {
  return item.kind === "product" ? item.product.likes : item.post.likes;
}

interface PersonalizationSignals {
  followed: string[];
  watched: string[];
  categoryAffinity: Partial<Record<CategorySlug, number>>;
}

/**
 * Mock "For You" ranking — a stand-in for a real recommendation model. It blends a
 * quality signal (rating/likes) with frontend proxies for interest, weighted by how
 * strong each signal is: following a creator is the biggest lift, buying into a
 * category beats saving it, which beats liking it, which beats just clicking through.
 * A mild recency lift keeps the feed from calcifying around the same evergreen
 * favorites, and already-watched items get pushed down so it keeps moving. A real
 * backend would replace this with actual watch-time and embedding-based similarity.
 */
function forYouScore(item: FeedItem, signals: PersonalizationSignals, isPromoted: (productId: string) => boolean): number {
  let score = item.kind === "product" ? item.product.rating * item.product.likes : item.post.likes * 3;

  if (signals.followed.includes(item.creatorId)) score *= 1.8;

  const affinity = item.category ? (signals.categoryAffinity[item.category] ?? 0) : 0;
  score *= 1 + Math.min(affinity * 0.18, 1.4);

  if (postedAtMinutes(item) < 60 * 24) score *= 1.15;

  if (signals.watched.includes(itemId(item))) score *= 0.6;

  // Sponsored placements get a mild lift — never enough on its own to outrank a strong organic match.
  if (item.kind === "product" && isPromoted(item.product.id)) score *= 1.3;

  return score;
}

export function DiscoverContent() {
  const searchParams = useSearchParams();
  const [feedTab, setFeedTab] = useState("for-you");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "all");
  const { followed, posts: userPosts, liked, saved, collection, clickedProductIds, watchedIds, isPromoted } =
    useAppState();
  const allProducts = useAllProducts();
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();

  const signals = useMemo<PersonalizationSignals>(() => {
    const categoryAffinity: Partial<Record<CategorySlug, number>> = {};
    // Weighted by how strong a signal of real interest each action is — buying it says
    // far more than clicking into it once.
    const bump = (id: string, weight: number) => {
      const product = allProducts.find((p) => p.id === id);
      if (!product) return;
      categoryAffinity[product.category] = (categoryAffinity[product.category] ?? 0) + weight;
    };
    collection.forEach((entry) => bump(entry.productId, 3));
    saved.forEach((id) => bump(id, 2));
    liked.forEach((id) => bump(id, 1));
    clickedProductIds.forEach((id) => bump(id, 0.5));
    return { followed, watched: watchedIds, categoryAffinity };
  }, [liked, saved, collection, clickedProductIds, watchedIds, followed, allProducts]);

  const feed = useMemo<FeedItem[]>(() => {
    const productItems: FeedItem[] = allProducts.map((product) => ({
      kind: "product",
      id: product.id,
      creatorId: product.creatorId,
      category: product.category,
      product,
    }));
    const postItems: FeedItem[] = [...userPosts, ...feedPosts].map((post) => ({
      kind: "post",
      id: post.id,
      creatorId: post.creatorId,
      category: post.category,
      post,
    }));
    return [...productItems, ...postItems];
  }, [userPosts, allProducts]);

  const filtered = useMemo(() => {
    let list = feed;

    if (category !== "all") {
      list = list.filter((item) => item.category === category);
    }

    if (query) {
      list = list.filter((item) => {
        const creator = getCreatorById(item.creatorId);
        const text =
          item.kind === "product"
            ? `${item.product.title} ${item.product.tagline}`
            : item.post.caption;
        return text.toLowerCase().includes(query) || creator?.name.toLowerCase().includes(query);
      });
    }

    switch (feedTab) {
      case "trending":
        list = list.filter(isTrending).sort((a, b) => likesOf(b) - likesOf(a));
        break;
      case "newest":
        list = [...list].sort((a, b) => postedAtMinutes(a) - postedAtMinutes(b));
        break;
      case "following":
        list = list.filter((item) => followed.includes(item.creatorId));
        break;
      default:
        list = [...list].sort((a, b) => forYouScore(b, signals, isPromoted) - forYouScore(a, signals, isPromoted));
    }

    return list;
  }, [feed, category, query, feedTab, followed, signals, isPromoted]);

  const showFollowingEmpty = feedTab === "following" && followed.length === 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollByOnePost(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    // "auto" (instant), not "smooth" — scroll-snap-stop: always on the cards blocks
    // programmatic smooth scrolling/scrollIntoView in some engines, silently no-op-ing it.
    el.scrollBy({ top: direction * el.clientHeight, behavior: "auto" });
  }

  return (
    <div className="mx-auto w-full max-w-md md:max-w-[440px] md:py-4 lg:max-w-[660px]">
      <div className="relative">
        {/* Box height exactly fills the viewport under the 64px top bar, minus the
            md:py-4 margin above/below it — nothing else may add height outside this box. */}
        {/* This wrapper is purely a scroll/clip boundary at desktop — each card carries
            its own dark background and shadow, so this must stay visually invisible or
            it paints a black panel behind the action rail too. */}
        <div className="relative h-[calc(100dvh-134px)] w-full overflow-hidden bg-ink md:h-[calc(100dvh-64px-2rem)] md:rounded-3xl md:shadow-card-hover lg:rounded-none lg:bg-transparent lg:shadow-none">
          {showFollowingEmpty ? (
            <FeedEmptyState
              icon={UserPlus}
              title="Follow creators to see their drops"
              body="Products and posts from creators you follow will play here first."
            />
          ) : filtered.length === 0 ? (
            <FeedEmptyState icon={SearchX} title="No results match" body="Try a different search term or category." />
          ) : (
            <div ref={scrollRef} className="snap-y-mandatory no-scrollbar h-full w-full overflow-y-auto lg:flex lg:flex-col lg:gap-6">
              {/* Filters only ever appear here, before the first post — they scroll away
                  with it and never reappear above later posts. */}
              <div className="flex flex-col gap-2 bg-ink p-3 pb-4 sm:p-4" style={{ scrollSnapAlign: "start" }}>
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {FEED_TABS.map((tab) => (
                    <FilterPill key={tab.id} tab={tab} active={feedTab === tab.id} onClick={() => setFeedTab(tab.id)} />
                  ))}
                </div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {CATEGORY_TABS.map((tab) => (
                    <FilterPill key={tab.id} tab={tab} active={category === tab.id} onClick={() => setCategory(tab.id)} />
                  ))}
                </div>
              </div>

              {filtered.map((item) =>
                item.kind === "product" ? (
                  <ProductVideoCard key={item.id} product={item.product} />
                ) : (
                  <PostCard key={item.id} post={item.post} />
                )
              )}
            </div>
          )}
        </div>

        {!showFollowingEmpty && filtered.length > 0 && (
          <div className="absolute -right-20 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
            <button
              type="button"
              onClick={() => scrollByOnePost(-1)}
              aria-label="Previous post"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink-soft shadow-card transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <ChevronUp size={20} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollByOnePost(1)}
              aria-label="Next post"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink-soft shadow-card transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <ChevronDown size={20} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedEmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-ink px-8 text-center text-white">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
        <Icon size={28} aria-hidden />
      </span>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="max-w-xs text-sm text-white/70">{body}</p>
    </div>
  );
}
