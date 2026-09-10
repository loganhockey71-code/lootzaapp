export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type CategorySlug =
  | "gaming"
  | "graphics"
  | "social"
  | "web"
  | "creator"
  | "ai";

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  accent: string;
}

export type BadgeId = "top-seller" | "product-creator" | "community-favorite" | "elite" | "rising-star";

export interface CreatorBadge {
  id: BadgeId;
  label: string;
}

export interface Creator {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  avatarSeed: string;
  tagline: string;
  bio: string;
  verified: boolean;
  level: number;
  xp: number;
  xpToNextLevel: number;
  sellerTier: string;
  joined: string;
  followers: number;
  positiveReviewPct: number;
  responseTime: string;
  badges: CreatorBadge[];
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  verified: boolean;
  body: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string[];
  category: CategorySlug;
  creatorId: string;
  /** Real Supabase auth id of the seller, present only for products backed by the `products` table (not mock/seed ones). */
  sellerId?: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  sold: number;
  likes: number;
  coverImage: string | null;
  coverSeed: string;
  gallerySeeds: string[];
  /** Real video for the Discover feed. Null falls back to an animated generated cover. */
  videoUrl: string | null;
  badge?: "trending" | "new" | "featured";
  /** Present only for timed/limited event drops — absent for normal listings. */
  drop?: DropInfo;
  postedAt: string;
  fileSize: string;
  fileTypes: string[];
  compatibleWith: string[];
  lastUpdated: string;
  whatsIncluded: string[];
  usageRights: "Personal Use" | "Commercial Use";
  reviews: Review[];
  /** Optional seller-set cap. Remaining is fixed at listing time — not decremented on purchase. */
  limitedQuantity?: { total: number; remaining: number };
  /** Optional ISO datetime. Before this moment the listing shows a countdown and can't be bought. */
  releaseAt?: string | null;
  /**
   * Path (not a URL) to the seller's file inside the private product-files Storage
   * bucket. Present only for real Supabase-backed products. Never render this as a
   * link — there is no public URL for it; buyer downloads are a separate, not-yet-built
   * entitlements step that will mint short-lived signed URLs.
   */
  productFilePath?: string | null;
}

export type FeedPostType = "video" | "image";

/** A Discover feed entry that isn't a product listing — a creator's video/photo update, optionally tied to a product. */
export interface FeedPost {
  id: string;
  type: FeedPostType;
  creatorId: string;
  mediaUrl: string | null;
  coverSeed: string;
  category: CategorySlug | null;
  caption: string;
  linkedProductId: string | null;
  likes: number;
  postedAt: string;
  /** Optional co-creator credited on this post/video. */
  collaboratorId?: string | null;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

/**
 * Mirrors the `public.profiles` row for the signed-in user. username/displayName/
 * avatarUrl/bio are user-editable via `updateProfile`; level/xp/coins/isSeller are
 * server-controlled and read-only from the client (see the `profiles` migration's
 * protect_profile_progression trigger) — they are NOT the same numbers shown by the
 * rest of Lootza's UI today, which still runs on the existing localStorage economy.
 */
export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  level: number;
  xp: number;
  coins: number;
  isSeller: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Lootza Coins: spendable currency, kept strictly separate from XP (progression). */
export type CoinReason =
  | "daily-challenge"
  | "weekly-challenge"
  | "achievement"
  | "level-up"
  | "first-purchase"
  | "purchase"
  | "referral"
  | "special-event"
  | "streak"
  | "spend"
  | "coin-purchase"
  | "promotion"
  | "leaderboard-reward";

export interface CoinTxn {
  id: string;
  amount: number;
  reason: CoinReason;
  label: string;
  createdAt: string;
}

export type XpReason =
  | "post"
  | "product-upload"
  | "sale"
  | "review"
  | "challenge"
  | "discover"
  | "daily-active"
  | "leaderboard";

export interface XpTxn {
  id: string;
  amount: number;
  reason: XpReason;
  label: string;
  createdAt: string;
}

export type CosmeticType = "frame" | "background" | "title" | "collectible" | "effect";

export interface CosmeticItem {
  id: string;
  type: CosmeticType;
  name: string;
  description: string;
  price: number;
  rarity: Rarity;
  /** Two-stop gradient used to render a preview swatch without needing real art assets. */
  colors: [string, string];
}

export type NotificationType =
  | "comment"
  | "reply"
  | "sale"
  | "purchase"
  | "follow"
  | "collaboration"
  | "leaderboard"
  | "level-up"
  | "coins"
  | "achievement"
  | "new-drop"
  | "limited-drop";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export type ChallengeGoalType =
  | "watch-discover"
  | "like-product"
  | "post-video"
  | "upload-product"
  | "make-sale"
  | "leave-review";

export interface Challenge {
  id: string;
  scope: "daily" | "weekly";
  title: string;
  description: string;
  goalType: ChallengeGoalType;
  goalCount: number;
  rewardXp: number;
  rewardCoins: number;
}

export interface ChallengeProgress {
  count: number;
  claimed: boolean;
  completedAt: string | null;
}

export interface CommentEntry {
  id: string;
  /** The product or feed-post id this comment thread belongs to. */
  targetId: string;
  authorName: string;
  body: string;
  createdAt: string;
  parentId: string | null;
}

/** Info that turns a normal listing into a timed/limited event drop. Optional — most products have none. */
export interface DropInfo {
  tag: "limited" | "event";
  endsAt: string;
  quantityTotal: number;
  quantityRemaining: number;
}

export type PromotionMethod = "coins" | "cash";

/** A seller-funded ad campaign boosting one product's visibility. Status is derived from spent/budget/paused, not stored separately. */
export interface Promotion {
  id: string;
  productId: string;
  method: PromotionMethod;
  /** In Lootza Coins if method is "coins", in USD if method is "cash". */
  dailyBudget: number;
  durationDays: number;
  /** dailyBudget × durationDays, in the same unit as dailyBudget. */
  budget: number;
  spent: number;
  views: number;
  clicks: number;
  sales: number;
  paused: boolean;
  createdAt: string;
}
