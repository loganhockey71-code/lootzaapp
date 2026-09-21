import { xpThresholdForLevel } from "@/lib/leveling";
import type { BadgeId, Creator, CreatorBadge, Product, Profile } from "@/lib/types";

/** Builds the public Creator view of a real profile row. */
export function profileToCreator(profile: Profile): Creator {
  const joined = new Date(profile.createdAt);
  return {
    id: profile.id,
    handle: profile.username,
    name: profile.displayName?.trim() || profile.username,
    avatar: profile.avatarUrl,
    avatarSeed: profile.id,
    bio: profile.bio?.trim() ?? "",
    level: profile.level,
    xp: profile.xp,
    xpToNextLevel: xpThresholdForLevel(profile.level),
    joined: Number.isNaN(joined.getTime())
      ? ""
      : joined.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
  };
}

export function sellerTierForLevel(level: number): string {
  if (level >= 5) return "Elite Seller";
  if (level >= 4) return "Pro Seller";
  if (level >= 2) return "Rising Seller";
  return "New Seller";
}

const BADGE_LABELS: Record<BadgeId, string> = {
  "product-creator": "Product Creator",
  "rising-star": "Rising Star",
  "top-seller": "Top Seller",
  "community-favorite": "Community Favorite",
  elite: "Elite Seller",
};

/**
 * Achievements a seller has actually earned, derived from their real listings
 * and real (Stripe-backed) sale counts - never assigned by hand.
 */
export function earnedBadges(products: Product[]): CreatorBadge[] {
  const totalSold = products.reduce((sum, p) => sum + p.sold, 0);
  const ids: BadgeId[] = [];
  if (products.length > 0) ids.push("product-creator");
  if (totalSold >= 1) ids.push("rising-star");
  if (totalSold >= 10) ids.push("top-seller");
  return ids.map((id) => ({ id, label: BADGE_LABELS[id] }));
}

/**
 * Stand-in shown for the split second between a product/post loading and its
 * author's profile arriving (profiles are fetched right after the content).
 * Links to the id so they still resolve; never a hardcoded person.
 */
export function unknownCreator(id: string): Creator {
  return {
    id,
    handle: id,
    name: "Creator",
    avatar: null,
    avatarSeed: id,
    bio: "",
    level: 1,
    xp: 0,
    xpToNextLevel: xpThresholdForLevel(1),
    joined: "",
  };
}
