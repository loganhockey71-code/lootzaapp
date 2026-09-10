import type { Creator, FeedPost, Product } from "@/lib/types";

const HASHTAG_RE = /#([a-zA-Z0-9_]+)/g;

/** Extracts unique hashtags (without the #) from a piece of text, in order of first appearance. */
export function extractHashtags(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(HASHTAG_RE)) {
    seen.add(match[1].toLowerCase());
  }
  return [...seen];
}

/** Curated stand-in for a real "what's trending" signal — a backend would compute this from search volume. */
export const TRENDING_SEARCHES: string[] = [
  "cyberpunk ui kit",
  "notion template",
  "ai prompts",
  "stream overlay",
  "icon pack",
  "portfolio template",
];

export function searchProducts(products: Product[], query: string, limit = 4): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products
    .filter((p) => p.title.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q))
    .slice(0, limit);
}

export function searchCreators(creators: Creator[], query: string, limit = 3): Creator[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return creators
    .filter((c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q))
    .slice(0, limit);
}

/** Scans post captions for hashtags matching the query, ranked by how often each tag appears. */
export function searchHashtags(posts: FeedPost[], query: string, limit = 4): string[] {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of extractHashtags(post.caption)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const all = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  if (!q) return all.slice(0, limit);
  return all.filter((tag) => tag.includes(q)).slice(0, limit);
}
