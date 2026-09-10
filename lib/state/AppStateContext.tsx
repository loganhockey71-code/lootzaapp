"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type {
  AuthUser,
  ChallengeProgress,
  CommentEntry,
  CosmeticType,
  FeedPost,
  Product,
  Profile,
  Promotion,
  PromotionMethod,
  Review,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { fetchActiveProducts, insertProduct, type NewProductInput } from "@/lib/supabase/products";
import { fetchMyPurchases, type PurchaseRecord } from "@/lib/supabase/purchases";
import { getCreatorById } from "@/lib/data/creators";
import { products as seedProducts } from "@/lib/data/products";
import { feedPosts as seedFeedPosts } from "@/lib/data/feedPosts";
import { challenges } from "@/lib/data/challenges";
import { getCosmetic } from "@/lib/data/cosmetics";
import { getCoinPackage } from "@/lib/data/coinPackages";
import { adSpendToUsd, estimateAdReach, MIN_AD_SPEND_USD } from "@/lib/ads";
import { hashSeed, formatPrice } from "@/lib/utils";
import { grantCoins, grantXp, pushNotification, bumpChallengeProgress, type RewardsShape } from "./rewards";

const CURRENT_USER_ID = "pixelmax";
/** Max free coins simulateReferral can ever grant — an unlimited "invite" button would be a coin-farming exploit. */
export const MAX_SIMULATED_REFERRALS = 10;

export interface CollectionEntry {
  productId: string;
  purchasedAt: string;
}

interface PersistedShape extends RewardsShape {
  liked: string[];
  saved: string[];
  followed: string[];
  collection: CollectionEntry[];
  myListings: Product[];
  posts: FeedPost[];
  notifiedProductIds: string[];
  referralCount: number;
  recentSearches: string[];
  promotions: Promotion[];
  claimedWeeklyLeaderboardReward: boolean;
  leaderboardBadges: string[];
}

export type AuthResult = { ok: true; needsEmailConfirmation?: boolean } | { ok: false; error: string };

export type ProfileUpdate = Partial<Pick<Profile, "username" | "displayName" | "avatarUrl" | "bio">>;

interface AppState extends PersistedShape {
  user: AuthUser | null;
  profile: Profile | null;
  updateProfile: (updates: ProfileUpdate) => Promise<AuthResult>;
  toggleLike: (productId: string) => void;
  toggleSave: (productId: string) => void;
  toggleFollow: (creatorId: string) => void;
  isLiked: (productId: string) => boolean;
  isSaved: (productId: string) => boolean;
  isFollowed: (creatorId: string) => boolean;
  isOwned: (productId: string) => boolean;
  purchase: (productId: string) => void;
  addListing: (product: Product) => void;
  // Real (Supabase-backed) products — kept separate from the seed catalog and myListings.
  supabaseProducts: Product[];
  productsLoading: boolean;
  productsError: string | null;
  createSupabaseProduct: (input: NewProductInput) => Promise<{ ok: true; product: Product } | { ok: false; error: string }>;
  // Real (Supabase-backed) purchases — the buyer's own, persisted server-side.
  // Created only by the Stripe webhook (see app/api/stripe/webhook), never by
  // the client — so the only client-side operation is re-reading them.
  purchases: PurchaseRecord[];
  purchasesLoading: boolean;
  refetchPurchases: () => Promise<PurchaseRecord[]>;
  addPost: (post: FeedPost) => void;
  signUp: (username: string, email: string, password: string) => Promise<AuthResult>;
  logIn: (email: string, password: string) => Promise<AuthResult>;
  logOut: () => Promise<void>;
  // Coins & cosmetics
  purchaseCosmetic: (id: string) => AuthResult;
  equipCosmetic: (type: CosmeticType, id: string | null) => void;
  simulateReferral: () => AuthResult;
  purchaseCoins: (packageId: string) => AuthResult;
  // Search
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  // Promotions
  createPromotion: (product: Product, method: PromotionMethod, dailyBudget: number, durationDays: number) => AuthResult;
  togglePromotionPause: (id: string) => void;
  isPromoted: (productId: string) => boolean;
  // Leaderboard
  claimWeeklyLeaderboardReward: (reward: { coins: number; badge: string | null; bonusXp: number; label: string }) => AuthResult;
  // Notifications
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  unreadNotificationCount: number;
  // Challenges
  claimChallenge: (id: string) => AuthResult;
  // Comments
  addComment: (targetId: string, body: string, parentId?: string | null) => void;
  commentsFor: (targetId: string) => CommentEntry[];
  // Reviews
  addReview: (productId: string, rating: number, body: string) => void;
  reviewsFor: (productId: string) => Review[];
  // Discover personalization signals
  recordWatch: (id: string) => void;
  recordClick: (productId: string) => void;
  hydrated: boolean;
}

const STORAGE_KEY = "lootza:app-state:v1";
const CURRENT_USERNAME = "You";

const AppStateContext = createContext<AppState | null>(null);

/** Supabase owns the account; we only read the display name back out of user_metadata. */
function toAuthUser(user: SupabaseUser): AuthUser {
  const username = (user.user_metadata?.username as string | undefined)?.trim() || user.email?.split("@")[0] || "User";
  return { id: user.id, username, email: user.email ?? "" };
}

/** Maps a `public.profiles` row (snake_case, as Postgres returns it) to our camelCase Profile type. */
function toProfile(row: {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  xp: number;
  coins: number;
  is_seller: boolean;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    level: row.level,
    xp: row.xp,
    coins: row.coins,
    isSeller: row.is_seller,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadInitial(): PersistedShape {
  return {
    liked: [],
    saved: [],
    followed: [],
    collection: [],
    myListings: [],
    posts: [],
    coins: 0,
    coinTxns: [],
    level: 4,
    xp: 4230,
    xpTxns: [],
    notifications: [],
    challengeProgress: {},
    comments: [],
    userReviews: {},
    ownedCosmetics: [],
    equipped: { frame: null, background: null, title: null, effect: null },
    watchedIds: [],
    clickedProductIds: [],
    lastActiveDate: null,
    streakCount: 0,
    notifiedProductIds: [],
    referralCount: 0,
    recentSearches: [],
    promotions: [],
    claimedWeeklyLeaderboardReward: false,
    leaderboardBadges: [],
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedShape>(loadInitial);
  const [localHydrated, setLocalHydrated] = useState(false);

  // The signed-in user comes entirely from Supabase's own session, not the
  // localStorage blob above — Supabase already persists/refreshes it itself.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const hydrated = localHydrated && authChecked;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Campaigns saved before daily-budget/duration existed only have a flat `budget` —
        // treat that as a single day so old localStorage data keeps rendering.
        if (Array.isArray(parsed.promotions)) {
          parsed.promotions = parsed.promotions.map((p: Partial<Promotion> & { budget: number }) => ({
            durationDays: 1,
            dailyBudget: p.budget,
            ...p,
          }));
        }
        // One-time hydration from a browser-only API: localStorage isn't available during SSR,
        // so state can't be initialized lazily without a server/client mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore malformed local storage
    } finally {
      setLocalHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable (private mode, quota) — safe to ignore in a prototype
    }
  }, [state, hydrated]);

  // Reads the existing Supabase session on load, then stays in sync with it —
  // sign-in, sign-out, and token refresh all flow through this one listener.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ? toAuthUser(session.user) : null);
      setAuthChecked(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAuthUser(session.user) : null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Loads the real `profiles` row for whoever is signed in, and clears it on logout.
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!user) {
      // Clearing derived state when its source (the signed-in user) disappears —
      // not a render-loop risk since `user` itself only changes via the auth listener.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      // Explicit columns, not "*": profiles also carries stripe_account_id /
      // stripe_payouts_enabled (Stripe Connect state), which the client has
      // no reason to see — the "viewable by everyone" RLS policy is row-level
      // only, so it can't restrict those columns itself.
      .select("id, username, display_name, avatar_url, bio, level, xp, coins, is_seller, created_at, updated_at")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load profile:", error.message);
          setProfile(null);
          return;
        }
        setProfile(toProfile(data));
      });
    return () => {
      active = false;
    };
  }, [user]);

  // Real, Supabase-backed listings — public read, so this loads for everyone
  // (not gated on `user`) and is kept entirely separate from the seed catalog.
  const [supabaseProducts, setSupabaseProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetchActiveProducts()
      .then((list) => {
        if (!active) return;
        setSupabaseProducts(list);
        setProductsError(null);
      })
      .catch((err: Error) => {
        if (!active) return;
        console.error("Failed to load products:", err.message);
        setProductsError(err.message);
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const createSupabaseProduct = useCallback(
    async (input: NewProductInput): Promise<{ ok: true; product: Product } | { ok: false; error: string }> => {
      try {
        const product = await insertProduct(input);
        setSupabaseProducts((prev) => [product, ...prev]);
        return { ok: true, product };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Failed to create listing." };
      }
    },
    []
  );

  // Real, Supabase-backed purchases — the signed-in buyer's own, so this is
  // gated on `user` and refetched on every login (this is what makes owning a
  // real product survive refresh/logout/a different browser or device).
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPurchases([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPurchasesLoading(false);
      return;
    }
    let active = true;
    setPurchasesLoading(true);
    fetchMyPurchases(user.id)
      .then((list) => {
        if (active) setPurchases(list);
      })
      .catch((err: Error) => {
        console.error("Failed to load purchases:", err.message);
      })
      .finally(() => {
        if (active) setPurchasesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const refetchPurchases = useCallback(async (): Promise<PurchaseRecord[]> => {
    if (!user) return [];
    const list = await fetchMyPurchases(user.id);
    setPurchases(list);
    return list;
  }, [user]);

  // Daily streak + "being active" XP — adjusted during render (not an effect)
  // so it settles in the same pass instead of causing an extra render.
  if (hydrated && user) {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastActiveDate !== today) {
      setState((prev) => {
        if (prev.lastActiveDate === today) return prev;
        const streak = prev.lastActiveDate
          ? new Date(today).getTime() - new Date(prev.lastActiveDate).getTime() === 86_400_000
            ? prev.streakCount + 1
            : 1
          : 1;
        let next = { ...prev, lastActiveDate: today, streakCount: streak };
        next = grantXp(next, 20, "daily-active", "Daily visit");
        if ([3, 7, 14, 30].includes(streak)) {
          next = grantCoins(next, streak * 20, "streak", `${streak}-day streak bonus`);
        }
        // Mock incoming activity on the seller's own catalog — notification only, no reward,
        // so it can't be used to farm coins/XP; capped at once per real day like the streak check.
        const myProducts = [...seedProducts.filter((p) => p.creatorId === CURRENT_USER_ID), ...next.myListings];
        if (myProducts.length > 0 && hashSeed(`sale-${today}`) % 5 < 2) {
          const sold = myProducts[hashSeed(`sale-pick-${today}`) % myProducts.length];
          next = pushNotification(
            next,
            "sale",
            "You made a sale!",
            `"${sold.title}" just sold for ${formatPrice(sold.price)}.`,
            `/product/${sold.slug}`
          );
        }
        return next;
      });
    }
  }

  const toggleLike = useCallback((productId: string) => {
    setState((prev) => {
      const alreadyLiked = prev.liked.includes(productId);
      let next: PersistedShape = {
        ...prev,
        liked: alreadyLiked ? prev.liked.filter((id) => id !== productId) : [...prev.liked, productId],
      };
      if (!alreadyLiked) {
        next = bumpChallengeProgress(next, "like-product", 1);
      }
      return next;
    });
  }, []);

  const toggleSave = useCallback((productId: string) => {
    setState((prev) => ({
      ...prev,
      saved: prev.saved.includes(productId)
        ? prev.saved.filter((id) => id !== productId)
        : [...prev.saved, productId],
    }));
  }, []);

  const toggleFollow = useCallback((creatorId: string) => {
    setState((prev) => {
      const nowFollowing = !prev.followed.includes(creatorId);
      let next: PersistedShape = {
        ...prev,
        followed: nowFollowing ? [...prev.followed, creatorId] : prev.followed.filter((id) => id !== creatorId),
      };

      if (nowFollowing) {
        const creator = getCreatorById(creatorId);
        const freshDrop = seedProducts.find(
          (p) => p.creatorId === creatorId && !next.notifiedProductIds.includes(p.id) && (p.badge === "new" || p.drop)
        );
        if (creator && freshDrop) {
          next = {
            ...next,
            notifiedProductIds: [...next.notifiedProductIds, freshDrop.id],
          };
          next = pushNotification(
            next,
            freshDrop.drop ? "limited-drop" : "new-drop",
            `${creator.name} dropped something new`,
            freshDrop.title,
            `/product/${freshDrop.slug}`
          );
        }
        // Mock reciprocal engagement — some creators notice and follow back. Deterministic
        // so the same creator always behaves the same way, not a real-time random event.
        if (creator && hashSeed(`follow-back-${creatorId}`) % 5 === 0) {
          next = pushNotification(
            next,
            "follow",
            `${creator.name} followed you back`,
            "Check out their latest drops.",
            `/@${creator.handle}`
          );
        }
      }

      return next;
    });
  }, []);

  const purchase = useCallback((productId: string) => {
    setState((prev) => {
      if (prev.collection.some((entry) => entry.productId === productId)) return prev;
      const product = [...seedProducts, ...prev.myListings].find((p) => p.id === productId);
      const isFirstEver = prev.collection.length === 0;
      let next: PersistedShape = {
        ...prev,
        collection: [...prev.collection, { productId, purchasedAt: new Date().toISOString() }],
      };
      next = grantXp(next, 60, "sale", "Completed a purchase");
      next = grantCoins(
        next,
        isFirstEver ? 150 : 25,
        isFirstEver ? "first-purchase" : "purchase",
        isFirstEver ? "First purchase bonus" : "Purchase reward"
      );
      next = bumpChallengeProgress(next, "make-sale", 1);
      if (product) {
        next = pushNotification(
          next,
          "purchase",
          "Purchase confirmed",
          `"${product.title}" was added to your collection.`,
          `/product/${product.slug}`
        );
      }
      return next;
    });
  }, []);

  const addListing = useCallback((product: Product) => {
    setState((prev) => {
      let next: PersistedShape = { ...prev, myListings: [product, ...prev.myListings] };
      next = grantXp(next, 120, "product-upload", `Uploaded "${product.title}"`);
      next = bumpChallengeProgress(next, "upload-product", 1);
      return next;
    });
  }, []);

  const addPost = useCallback((post: FeedPost) => {
    setState((prev) => {
      let next: PersistedShape = { ...prev, posts: [post, ...prev.posts] };
      next = grantXp(next, post.type === "video" ? 90 : 50, "post", post.type === "video" ? "Posted a video" : "Shared a post");
      if (post.type === "video") {
        next = bumpChallengeProgress(next, "post-video", 1);
      }
      if (post.collaboratorId) {
        const collaborator = getCreatorById(post.collaboratorId);
        if (collaborator) {
          next = pushNotification(
            next,
            "collaboration",
            "Collaboration tagged",
            `You tagged ${collaborator.name} as a collaborator on your ${post.type === "video" ? "video" : "post"}.`,
            `/@${collaborator.handle}`
          );
        }
      }
      return next;
    });
  }, []);

  const signUp = useCallback(async (username: string, email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: "Something went wrong creating your account. Please try again." };

    if (data.session) {
      // Immediate session (email confirmation is off) — same as the old instant-login demo flow.
      setUser(toAuthUser(data.user));
      setState((prev) => grantCoins(prev, 250, "special-event", "Welcome bonus — free coins for joining Lootza"));
      return { ok: true };
    }
    // Email confirmation is required — no session yet, so there's nothing to log the user into.
    return { ok: true, needsEmailConfirmation: true };
  }, []);

  const logIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: error.message };
    if (data.user) setUser(toAuthUser(data.user));
    return { ok: true };
  }, []);

  const logOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  // Only touches the user-editable columns — level/xp/coins/is_seller are
  // silently ignored server-side even if someone sneaks them into `updates`.
  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<AuthResult> => {
      if (!user) return { ok: false, error: "You must be logged in." };

      const payload: Record<string, string | null> = {};
      if (updates.username !== undefined) payload.username = updates.username.trim();
      if (updates.displayName !== undefined) payload.display_name = updates.displayName?.trim() || null;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
      if (updates.bio !== undefined) payload.bio = updates.bio;

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id)
        .select("id, username, display_name, avatar_url, bio, level, xp, coins, is_seller, created_at, updated_at")
        .single();

      if (error) {
        // Postgres unique_violation on the username column.
        if (error.code === "23505") return { ok: false, error: "That username is already taken." };
        return { ok: false, error: error.message };
      }
      setProfile(toProfile(data));
      return { ok: true };
    },
    [user]
  );

  const purchaseCosmetic = useCallback((id: string): AuthResult => {
    let result: AuthResult = { ok: true };
    setState((prev) => {
      if (prev.ownedCosmetics.includes(id)) {
        result = { ok: false, error: "You already own this." };
        return prev;
      }
      const item = getCosmetic(id);
      if (!item) {
        result = { ok: false, error: "That item doesn't exist." };
        return prev;
      }
      if (prev.coins < item.price) {
        result = { ok: false, error: "Not enough Lootza Coins." };
        return prev;
      }
      let next: PersistedShape = { ...prev, ownedCosmetics: [...prev.ownedCosmetics, id] };
      next = grantCoins(next, -item.price, "spend", `Bought ${item.name}`);
      next = pushNotification(next, "achievement", "New cosmetic unlocked", item.name);
      return next;
    });
    return result;
  }, []);

  const equipCosmetic = useCallback((type: CosmeticType, id: string | null) => {
    setState((prev) => {
      if (type === "collectible") return prev;
      return { ...prev, equipped: { ...prev.equipped, [type]: id } };
    });
  }, []);

  const simulateReferral = useCallback((): AuthResult => {
    let result: AuthResult = { ok: true };
    setState((prev) => {
      if (prev.referralCount >= MAX_SIMULATED_REFERRALS) {
        result = { ok: false, error: "You've reached the referral bonus limit for this demo." };
        return prev;
      }
      let next: PersistedShape = { ...prev, referralCount: prev.referralCount + 1 };
      next = grantCoins(next, 100, "referral", "A friend joined using your invite");
      return next;
    });
    return result;
  }, []);

  const purchaseCoins = useCallback((packageId: string): AuthResult => {
    let result: AuthResult = { ok: true };
    setState((prev) => {
      const pkg = getCoinPackage(packageId);
      if (!pkg) {
        result = { ok: false, error: "That coin package doesn't exist." };
        return prev;
      }
      return grantCoins(
        prev,
        pkg.coins,
        "coin-purchase",
        `Bought ${pkg.coins.toLocaleString()} coins ($${pkg.price.toFixed(2)})`
      );
    });
    return result;
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      recentSearches: [trimmed, ...prev.recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(
        0,
        8
      ),
    }));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setState((prev) => ({ ...prev, recentSearches: [] }));
  }, []);

  const createPromotion = useCallback(
    (product: Product, method: PromotionMethod, dailyBudget: number, durationDays: number): AuthResult => {
      let result: AuthResult = { ok: true };
      setState((prev) => {
        if (!Number.isFinite(dailyBudget) || dailyBudget <= 0 || !Number.isFinite(durationDays) || durationDays <= 0) {
          result = { ok: false, error: "Enter a valid daily budget and duration." };
          return prev;
        }
        if (adSpendToUsd(method, dailyBudget) < MIN_AD_SPEND_USD) {
          result = { ok: false, error: `Minimum ad spend is $${MIN_AD_SPEND_USD}/day.` };
          return prev;
        }

        const totalBudget = Math.round(dailyBudget * durationDays);
        if (method === "coins" && prev.coins < totalBudget) {
          result = { ok: false, error: "Not enough Lootza Coins." };
          return prev;
        }

        const id = `promo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const estimate = estimateAdReach(adSpendToUsd(method, totalBudget));
        const h = hashSeed(id);
        const variance = 0.85 + (h % 30) / 100;
        const views = Math.round(estimate.views * variance);
        const clicks = Math.round(estimate.clicks * variance);
        const sales = Math.round(estimate.sales * variance);
        const spent = Math.min(totalBudget, Math.round(totalBudget * (0.2 + ((h >> 9) % 40) / 100)));

        const promotion: Promotion = {
          id,
          productId: product.id,
          method,
          dailyBudget,
          durationDays,
          budget: totalBudget,
          spent,
          views,
          clicks,
          sales,
          paused: false,
          createdAt: new Date().toISOString(),
        };

        let next: PersistedShape = { ...prev, promotions: [promotion, ...prev.promotions] };
        if (method === "coins") {
          next = grantCoins(next, -totalBudget, "promotion", `Promoted "${product.title}"`);
        } else {
          next = pushNotification(
            next,
            "achievement",
            "Promotion started",
            `Promoting "${product.title}" for $${totalBudget.toFixed(2)}`
          );
        }
        return next;
      });
      return result;
    },
    []
  );

  const togglePromotionPause = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      promotions: prev.promotions.map((p) => (p.id === id ? { ...p, paused: !p.paused } : p)),
    }));
  }, []);

  const claimWeeklyLeaderboardReward = useCallback(
    (reward: { coins: number; badge: string | null; bonusXp: number; label: string }): AuthResult => {
      let result: AuthResult = { ok: true };
      setState((prev) => {
        if (prev.claimedWeeklyLeaderboardReward) {
          result = { ok: false, error: "You already claimed this week's leaderboard reward." };
          return prev;
        }
        let next: PersistedShape = {
          ...prev,
          claimedWeeklyLeaderboardReward: true,
          leaderboardBadges: reward.badge ? [...prev.leaderboardBadges, reward.badge] : prev.leaderboardBadges,
        };
        if (reward.coins > 0) {
          next = grantCoins(next, reward.coins, "leaderboard-reward", `Weekly leaderboard reward: ${reward.label}`);
        }
        if (reward.bonusXp > 0) {
          next = grantXp(next, reward.bonusXp, "leaderboard", `Weekly leaderboard reward: ${reward.label}`);
        }
        next = pushNotification(next, "leaderboard", "Weekly leaderboard reward", reward.label, "/leaderboard");
        return next;
      });
      return result;
    },
    []
  );

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({ ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const claimChallenge = useCallback((id: string): AuthResult => {
    let result: AuthResult = { ok: true };
    setState((prev) => {
      const challenge = challenges.find((c) => c.id === id);
      const progress: ChallengeProgress = prev.challengeProgress[id] ?? { count: 0, claimed: false, completedAt: null };
      if (!challenge) {
        result = { ok: false, error: "Unknown challenge." };
        return prev;
      }
      if (progress.claimed) {
        result = { ok: false, error: "Already claimed." };
        return prev;
      }
      if (progress.count < challenge.goalCount) {
        result = { ok: false, error: "Not completed yet." };
        return prev;
      }
      let next: PersistedShape = {
        ...prev,
        challengeProgress: { ...prev.challengeProgress, [id]: { ...progress, claimed: true } },
      };
      next = grantXp(next, challenge.rewardXp, "challenge", challenge.title);
      next = grantCoins(
        next,
        challenge.rewardCoins,
        challenge.scope === "daily" ? "daily-challenge" : "weekly-challenge",
        challenge.title
      );
      return next;
    });
    return result;
  }, []);

  const addComment = useCallback((targetId: string, body: string, parentId: string | null = null) => {
    if (!body.trim()) return;
    setState((prev) => {
      const comment: CommentEntry = {
        id: `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        targetId,
        authorName: CURRENT_USERNAME,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        parentId,
      };
      let next: PersistedShape = { ...prev, comments: [comment, ...prev.comments] };

      // Mock the creator noticing a top-level comment on their own product/post and
      // replying — deterministic per-comment so it isn't a repeatable reward loop.
      if (!parentId && hashSeed(comment.id) % 3 === 0) {
        const product = [...seedProducts, ...prev.myListings].find((p) => p.id === targetId);
        const post = [...seedFeedPosts, ...prev.posts].find((p) => p.id === targetId);
        const ownerId = product?.creatorId ?? post?.creatorId;
        if (ownerId && ownerId !== CURRENT_USER_ID) {
          const owner = getCreatorById(ownerId);
          const replies = [
            "Thanks so much for checking it out!",
            "Really appreciate the comment!",
            "Glad you like it — more coming soon.",
            "Thanks for the support!",
          ];
          if (owner) {
            next = pushNotification(
              next,
              "reply",
              `${owner.name} replied`,
              replies[hashSeed(`reply-${comment.id}`) % replies.length],
              product ? `/product/${product.slug}` : "/discover"
            );
          }
        }
      }

      return next;
    });
  }, []);

  const addReview = useCallback((productId: string, rating: number, body: string) => {
    if (!body.trim()) return;
    setState((prev) => {
      const owned = prev.collection.some((entry) => entry.productId === productId);
      const review: Review = {
        id: `review-${Date.now().toString(36)}`,
        author: CURRENT_USERNAME,
        rating,
        date: "Just now",
        verified: owned,
        body: body.trim(),
      };
      let next: PersistedShape = {
        ...prev,
        userReviews: { ...prev.userReviews, [productId]: [review, ...(prev.userReviews[productId] ?? [])] },
      };
      next = grantXp(next, 40, "review", "Left a review");
      next = bumpChallengeProgress(next, "leave-review", 1);
      return next;
    });
  }, []);

  const recordWatch = useCallback((id: string) => {
    setState((prev) => {
      if (prev.watchedIds.includes(id)) return prev;
      let next: PersistedShape = { ...prev, watchedIds: [...prev.watchedIds, id].slice(-300) };
      next = grantXp(next, 2, "discover", "Discovered something new");
      next = bumpChallengeProgress(next, "watch-discover", 1);
      return next;
    });
  }, []);

  const recordClick = useCallback((productId: string) => {
    setState((prev) => ({ ...prev, clickedProductIds: [...prev.clickedProductIds, productId].slice(-300) }));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ...state,
      user,
      profile,
      updateProfile,
      hydrated,
      toggleLike,
      toggleSave,
      toggleFollow,
      purchase,
      addListing,
      supabaseProducts,
      productsLoading,
      productsError,
      createSupabaseProduct,
      purchases,
      purchasesLoading,
      refetchPurchases,
      addPost,
      signUp,
      logIn,
      logOut,
      purchaseCosmetic,
      equipCosmetic,
      simulateReferral,
      purchaseCoins,
      addRecentSearch,
      clearRecentSearches,
      createPromotion,
      togglePromotionPause,
      isPromoted: (productId) =>
        state.promotions.some((p) => p.productId === productId && !p.paused && p.spent < p.budget),
      claimWeeklyLeaderboardReward,
      markAllNotificationsRead,
      markNotificationRead,
      unreadNotificationCount: state.notifications.filter((n) => !n.read).length,
      claimChallenge,
      addComment,
      commentsFor: (targetId) => state.comments.filter((c) => c.targetId === targetId),
      addReview,
      reviewsFor: (productId) => state.userReviews[productId] ?? [],
      recordWatch,
      recordClick,
      isLiked: (id) => state.liked.includes(id),
      isSaved: (id) => state.saved.includes(id),
      isFollowed: (id) => state.followed.includes(id),
      isOwned: (id) =>
        state.collection.some((entry) => entry.productId === id) ||
        purchases.some((p) => p.productId === id && p.status === "completed"),
    }),
    [
      state,
      user,
      profile,
      updateProfile,
      hydrated,
      toggleLike,
      toggleSave,
      toggleFollow,
      purchase,
      addListing,
      supabaseProducts,
      productsLoading,
      productsError,
      createSupabaseProduct,
      purchases,
      purchasesLoading,
      refetchPurchases,
      addPost,
      signUp,
      logIn,
      logOut,
      purchaseCosmetic,
      equipCosmetic,
      simulateReferral,
      purchaseCoins,
      addRecentSearch,
      clearRecentSearches,
      createPromotion,
      togglePromotionPause,
      claimWeeklyLeaderboardReward,
      markAllNotificationsRead,
      markNotificationRead,
      claimChallenge,
      addComment,
      addReview,
      recordWatch,
      recordClick,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
