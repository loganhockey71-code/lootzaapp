"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Clock, TrendingUp, Compass, Gift } from "lucide-react";
import { categories } from "@/lib/data/categories";
import { creators } from "@/lib/data/creators";
import { feedPosts } from "@/lib/data/feedPosts";
import { useAppState } from "@/lib/state/AppStateContext";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { searchProducts, searchCreators, searchHashtags, TRENDING_SEARCHES } from "@/lib/search";
import { ProductArtwork } from "@/components/product/ProductArtwork";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { cn, formatPrice } from "@/lib/utils";

export function SearchBar({
  className,
  autoFocus,
  onNavigate,
}: {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { recentSearches, addRecentSearch, posts: userPosts } = useAppState();
  const allProducts = useAllProducts();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const allPosts = useMemo(() => [...userPosts, ...feedPosts], [userPosts]);
  const matchProducts = useMemo(() => searchProducts(allProducts, query), [allProducts, query]);
  const matchCreators = useMemo(() => searchCreators(creators, query), [query]);
  const matchTags = useMemo(() => searchHashtags(allPosts, query), [allPosts, query]);
  const hasQuery = query.trim().length > 0;
  const categoryName = categories.find((c) => c.slug === category)?.name;

  function close() {
    setOpen(false);
    onNavigate?.();
  }

  function buildQuery(extra?: Record<string, string>) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return params.toString();
  }

  function go(path: string) {
    router.push(path);
    close();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) addRecentSearch(query.trim());
    go(`/search?${buildQuery()}`);
  }

  function pickSuggestion(q: string) {
    addRecentSearch(q);
    go(`/search?${new URLSearchParams({ q, ...(category !== "all" ? { category } : {}) }).toString()}`);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        onSubmit={submitSearch}
        className="flex h-10 items-stretch overflow-hidden rounded-full border border-border bg-bg transition-colors focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100"
      >
        <div className="relative shrink-0 border-r border-border bg-surface-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Search category"
            className="h-full cursor-pointer appearance-none bg-transparent py-0 pl-3 pr-6 text-xs font-semibold text-ink-soft outline-none"
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
        </div>
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            type="search"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={category === "all" ? "Search digital products..." : `Search in ${categoryName}...`}
            className="h-full w-full bg-transparent pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/70 outline-none"
          />
        </div>
      </form>

      {open && (
        <div className="animate-pop-in absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-card-hover">
          <div className="flex gap-2 p-1">
            <button
              type="button"
              onClick={() => go(`/discover?${buildQuery()}`)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-2 text-xs font-semibold text-ink hover:bg-border/60"
            >
              <Compass size={14} aria-hidden /> Search in Discover
            </button>
            <button
              type="button"
              onClick={() => go(`/drops?${buildQuery()}`)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-2 text-xs font-semibold text-ink hover:bg-border/60"
            >
              <Gift size={14} aria-hidden /> Search in Drops
            </button>
          </div>

          {hasQuery ? (
            <>
              {matchProducts.length > 0 && (
                <SuggestionSection title="Products">
                  {matchProducts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      onClick={close}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2"
                    >
                      <ProductArtwork product={p} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.title}</span>
                      <span className="shrink-0 text-xs font-semibold text-ink">{formatPrice(p.price)}</span>
                    </Link>
                  ))}
                </SuggestionSection>
              )}
              {matchCreators.length > 0 && (
                <SuggestionSection title="Creators">
                  {matchCreators.map((c) => (
                    <Link
                      key={c.id}
                      href={`/@${c.handle}`}
                      onClick={close}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2"
                    >
                      <CreatorAvatar name={c.name} seed={c.avatarSeed} avatarUrl={c.avatar} size={28} />
                      <span className="truncate text-sm text-ink">{c.name}</span>
                    </Link>
                  ))}
                </SuggestionSection>
              )}
              {matchTags.length > 0 && (
                <SuggestionSection title="Hashtags">
                  <div className="flex flex-wrap gap-1.5 px-2 py-1">
                    {matchTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => go(`/search?q=${encodeURIComponent(`#${tag}`)}`)}
                        className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-border/60"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </SuggestionSection>
              )}
              {matchProducts.length === 0 && matchCreators.length === 0 && matchTags.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-ink-soft">No quick matches. Press Enter to search.</p>
              )}
            </>
          ) : (
            <>
              {recentSearches.length > 0 && (
                <SuggestionSection title="Recent searches">
                  {recentSearches.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => pickSuggestion(q)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-surface-2"
                    >
                      <Clock size={14} className="text-ink-soft" aria-hidden />
                      <span className="truncate text-sm text-ink">{q}</span>
                    </button>
                  ))}
                </SuggestionSection>
              )}
              <SuggestionSection title="Trending searches">
                {TRENDING_SEARCHES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => pickSuggestion(q)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-surface-2"
                  >
                    <TrendingUp size={14} className="text-accent-600" aria-hidden />
                    <span className="truncate text-sm text-ink">{q}</span>
                  </button>
                ))}
              </SuggestionSection>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-1 border-t border-border pt-2 first:mt-0 first:border-0 first:pt-0">
      <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
