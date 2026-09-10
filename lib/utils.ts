export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Simple deterministic string hash (djb2) — used to seed generated artwork/avatars. */
export function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function pickFrom<T>(seed: string, items: readonly T[], salt = 0): T {
  const hash = hashSeed(seed + String(salt));
  return items[hash % items.length];
}

export function formatPrice(value: number): string {
  const fixed = value.toFixed(value % 1 === 0 ? 0 : 2);
  const [whole, decimals] = fixed.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${withCommas}${decimals ? `.${decimals}` : ""}`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function discountPercent(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/** Synthesizes a plausible 5→1 star breakdown from an average rating and review count. */
export function ratingBreakdown(rating: number, reviewCount: number): number[] {
  if (reviewCount === 0) return [0, 0, 0, 0, 0];
  const weights = [
    Math.max(0, rating - 3.2),
    Math.max(0, rating - 3.8) * 0.5,
    0.06,
    0.03,
    0.015,
  ];
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const counts = weights.map((w) => Math.round((w / total) * reviewCount));
  const diff = reviewCount - counts.reduce((a, b) => a + b, 0);
  counts[0] += diff;
  return counts;
}

/** True once a product's scheduled release time (if any) has passed. */
export function isReleased(product: { releaseAt?: string | null }): boolean {
  return !product.releaseAt || new Date(product.releaseAt).getTime() <= Date.now();
}

/** Converts relative strings like "2h ago", "1d ago", "3w ago" into minutes for sorting. */
export function postedAtToMinutes(postedAt: string): number {
  if (/just now/i.test(postedAt)) return 0;
  const match = postedAt.match(/(\d+)([mhdw])/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = { m: 1, h: 60, d: 60 * 24, w: 60 * 24 * 7 }[unit] ?? 1;
  return value * multiplier;
}
