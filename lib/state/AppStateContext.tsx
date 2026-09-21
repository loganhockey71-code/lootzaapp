"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type {
  AuthUser,
  ChallengeProgress,
  CommentEntry,
  CosmeticType,
  Creator,
  FeedPost,
  Product,
  Profile,
  Promotion,
  PromotionMethod,
  Review,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { fetchActiveProducts, insertProduct, type NewProductInput } from "@/lib/supabase/products";
import { fetchPosts, insertPost, type NewPostInput } from "@/lib/supabase/posts";
import { fetchMyPurchases, type PurchaseRecord } from "@/lib/supabase/purchases";
import {
  PROFILE_COLUMNS,
  fetchProfilesByIds,
  mapProfileRow,
  type ProfileRow,
} from "@/lib/supabase/profiles";
import {
  pruneOldAvatars,
  removeAvatarFile,
  uploadAvatar,
  validateAvatar,
} from "@/lib/supabase/storage";
import { profileToCreator } from "@/lib/creators";
import { challenges } from "@/lib/data/challenges";
import { getCosmetic } from "@/lib/data/cosmetics";
import { getCoinPackage } from "@/lib/data/coinPackages";
import { adSpendToUsd, estimateAdReach, MIN_AD_SPEND_USD } from "@/lib/ads";
import { hashSeed } from "@/lib/utils";
import { grantCoins, grantXp, pushNotification, bumpChallengeProgress, type RewardsShape } from "./rewards";

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
  /** Uploads a new profile picture to Supabase Storage and saves its URL on the signed-in user's profile. */
  uploadProfileAvatar: (file: File) => Promise<AuthResult>;
  removeProfileAvatar: () => Promise<AuthResult>;
  /** Resolves any user id (a product's seller, a post's author) to their real public profile, once loaded. */
  getCreator: (id: string) => Creator | undefined;
  toggleLike: (productId: string) => void;
  toggleSave: (productId: string) => void;
  toggleFollow: (creatorId: string) => void;
  isLiked: (productId: string) => boolean;
  isSaved: (productId: string) => boolean;
  isFollowed: (creatorId: string) => boolean;
  isOwned: (productId: string) => boolean;
  purchase: (productId: string) => void;
  // Real (Supabase-backed) products - the only catalog there is.
  supabaseProducts: Product[];
  /** Only the signed-in user's own listings (seller_id === their auth id). */
  myProducts: Product[];
  productsLoading: boolean;
  productsError: string | null;
  createSupabaseProduct: (input: NewProductInput) => Promise<{ ok: true; product: Product } | { ok: false; error: string }>;
  // Real (Supabase-backed) purchases — the buyer's own, persisted server-side.
  // Created only by the Stripe webhook (see app/api/stripe/webhook), never by
  // the client — so the only client-side operation is re-reading them.
  purchases: PurchaseRecord[];
  purchasesLoading: boolean;
  refetchPurchases: () => Promise<PurchaseRecord[]>;
  // Real (Supabase-backed) posts/videos, owned by their author's auth id.
  supabasePosts: FeedPost[];
  /** Only the signed-in user's own posts (author_id === their auth id). */
  myPosts: FeedPost[];
  postsLoading: boolean;
  createSupabasePost: (input: NewPostInput) => Promise<{ ok: true; post: FeedPost } | { ok: false; error: string }>;
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

// Progress that only lives in this browser (coins, likes, streaks...) is stored
// PER ACCOUNT. One shared key would leak the previous user's data into the next
// account that logs in on the same browser. The older, un-namespaced
// "lootza:app-state:v1" blob is intentionally never read: there's no way to know
// which account it belonged to.
const STORAGE_PREFIX = "lootza:app-state:v2:";
const storageKeyFor = (userId: string) => `${STORAGE_PREFIX}${userId}`;

const AppStateContext = createContext<AppState | null>(null);

/** Supabase owns the account; we only read the display name back out of user_metadata. */
function toAuthUser(user: SupabaseUser): AuthUser {
  const username = (user.user_metadata?.username as string | undefined)?.trim() || user.email?.split("@")[0] || "User";
  return { id: user.id, username, email: user.email ?? "" };
}

function loadInitial(): PersistedShape {
  return {
    liked: [],
    saved: [],
    followed: [],
    collection: [],
    coins: 0,
    coinTxns: [],
    level: 1,
    xp: 0,
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

  // The signed-in user comes entirely from Supabase's own session — Supabase
  // already persists/refreshes it itself.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const userId = user?.id ?? null;

  // Whose local progress `state` currently holds: `undefined` until the first
  // load, then the user id (or null when logged out). It differs from `userId`
  // for exactly one render after a login/logout/account switch — during that
  // window `hydrated` is false, so nothing renders or persists another
  // account's data under this account.
  const [stateOwnerId, setStateOwnerId] = useState<string | null | undefined>(undefined);
  const hydrated = authChecked && stateOwnerId === userId;

  // A brand-new signup that gets an immediate session earns a welcome bonus. It has to
  // be applied AFTER that account's (empty) local state is loaded below — granting it
  // in signUp() itself would just be overwritten by the load.
  const pendingWelcomeRef = useRef<string | null>(null);

  // (Re)loads this browser's saved progress whenever the signed-in account changes.
  useEffect(() => {
    if (!authChecked) return;
    let next = loadInitial();
    if (userId) {
      try {
        const raw = window.localStorage.getItem(storageKeyFor(userId));
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
          next = { ...next, ...parsed };
        }
      } catch {
        // ignore malformed local storage
      }
      if (pendingWelcomeRef.current === userId) {
        pendingWelcomeRef.current = null;
        next = grantCoins(next, 250, "special-event", "Welcome bonus — free coins for joining Lootza");
      }
    }
    // One-time hydration from a browser-only API (localStorage isn't available during SSR),
    // keyed on the account so switching users swaps ALL of this state atomically.
    setState(next);
    setStateOwnerId(userId);
  }, [authChecked, userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    try {
      window.localStorage.setItem(storageKeyFor(userId), JSON.stringify(state));
    } catch {
      // storage may be unavailable (private mode, quota) — safe to ignore in a prototype
    }
  }, [state, hydrated, userId]);

  // Reads the existing Supabase session on load, then stays in sync with it —
  // sign-in, sign-out, and token refresh all flow through this one listener.
  useEffect(() => {
    let active = true;
    // Keeps the same object when nothing about the account changed (token refreshes),
    // so they don't ripple re-renders through the whole app.
    const applySession = (session: { user: SupabaseUser } | null) => {
      const nextUser = session?.user ? toAuthUser(session.user) : null;
      setUser((prev) =>
        prev && nextUser && prev.id === nextUser.id && prev.username === nextUser.username && prev.email === nextUser.email
          ? prev
          : nextUser
      );
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      applySession(session);
      setAuthChecked(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Loads the real `profiles` row for whoever is signed in, and clears it on logout or
  // account switch — keyed on the user id so a token refresh doesn't refetch/flicker.
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    // Whatever was loaded belonged to the previous account (or nobody).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(null);
    if (!userId) return;
    let active = true;
    supabase
      .from("profiles")
      // Explicit columns, not "*": profiles also carries Stripe Connect state the
      // client has no reason to see (the database hides it from clients too).
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load profile:", error.message);
          setProfile(null);
          return;
        }
        setProfile(mapProfileRow(data as ProfileRow));
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // First-200-users bonus ($10 = 1,000 coins). The cap and the once-per-user rule
  // are enforced by claim_welcome_bonus() in Postgres; this only mirrors a
  // successful grant into the wallet balance, which is what the UI displays.
  const profileId = profile?.id ?? null;
  useEffect(() => {
    if (!profileId) return;
    let active = true;
    supabase.rpc("claim_welcome_bonus").then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error("Failed to claim welcome bonus:", error.message);
        return;
      }
      const granted = typeof data === "number" ? data : 0;
      if (granted <= 0) return;
      setState((prev) =>
        grantCoins(prev, granted, "special-event", "Early-adopter bonus — $10 in coins for the first 200 users")
      );
    });
    return () => {
      active = false;
    };
  }, [profileId]);

  // Real, Supabase-backed listings — public read, so this loads for everyone. Refetched
  // when the account changes so a seller's own listings are always current.
  const [supabaseProducts, setSupabaseProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  useEffect(() => {
    if (!authChecked) return;
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
  }, [authChecked, userId]);

  // Real, Supabase-backed posts/videos — same public-read rules as products.
  const [supabasePosts, setSupabasePosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  useEffect(() => {
    if (!authChecked) return;
    let active = true;
    fetchPosts()
      .then((list) => {
        if (active) setSupabasePosts(list);
      })
      .catch((err: Error) => {
        console.error("Failed to load posts:", err.message);
      })
      .finally(() => {
        if (active) setPostsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authChecked, userId]);

  const myProducts = useMemo(
    () => (userId ? supabaseProducts.filter((p) => p.sellerId === userId) : []),
    [supabaseProducts, userId]
  );
  const myPosts = useMemo(
    () => (userId ? supabasePosts.filter((p) => p.creatorId === userId) : []),
    [supabasePosts, userId]
  );

  // Public profiles of every seller/author/collaborator that appears in the
  // loaded content, fetched once each. This is what replaces the old hardcoded
  // creator list: a card's creator is whatever `profiles` row owns the content.
  const [creatorsById, setCreatorsById] = useState<Record<string, Creator>>({});
  const requestedCreatorIds = useRef(new Set<string>());
  useEffect(() => {
    const wanted = new Set<string>();
    for (const p of supabaseProducts) wanted.add(p.creatorId);
    for (const p of supabasePosts) {
      wanted.add(p.creatorId);
      if (p.collaboratorId) wanted.add(p.collaboratorId);
    }
    const missing = [...wanted].filter((id) => !requestedCreatorIds.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requestedCreatorIds.current.add(id));
    fetchProfilesByIds(missing)
      .then((list) => {
        if (list.length === 0) return;
        setCreatorsById((prev) => {
          const next = { ...prev };
          for (const pr of list) next[pr.id] = profileToCreator(pr);
          return next;
        });
      })
      .catch((err: Error) => {
        console.error("Failed to load creator profiles:", err.message);
        // Let a later render retry these.
        missing.forEach((id) => requestedCreatorIds.current.delete(id));
      });
  }, [supabaseProducts, supabasePosts]);

  const getCreator = useCallback(
    (id: string): Creator | undefined => (profile && profile.id === id ? profileToCreator(profile) : creatorsById[id]),
    [profile, creatorsById]
  );

  const createSupabaseProduct = useCallback(
    async (input: NewProductInput): Promise<{ ok: true; product: Product } | { ok: false; error: string }> => {
      try {
        const product = await insertProduct(input);
        setSupabaseProducts((prev) => [product, ...prev.filter((p) => p.id !== product.id)]);
        setState((prev) => {
          const next = grantXp(prev, 120, "product-upload", `Uploaded "${product.title}"`);
          return bumpChallengeProgress(next, "upload-product", 1);
        });
        return { ok: true, product };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Failed to create listing." };
      }
    },
    []
  );

  const createSupabasePost = useCallback(
    async (input: NewPostInput): Promise<{ ok: true; post: FeedPost } | { ok: false; error: string }> => {
      try {
        const post = await insertPost(input);
        setSupabasePosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
        setState((prev) => {
          let next = grantXp(prev, post.type === "video" ? 90 : 50, "post", post.type === "video" ? "Posted a video" : "Shared a post");
          if (post.type === "video") next = bumpChallengeProgress(next, "post-video", 1);
          return next;
        });
        return { ok: true, post };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Failed to publish post." };
      }
    },
    []
  );

  // Real, Supabase-backed purchases — the signed-in buyer's own, gated on the
  // account and refetched whenever it changes (this is what makes owning a real
  // product survive refresh/logout/a different browser or device).
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  useEffect(() => {
    // Never keep the previous account's purchases around while the next ones load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPurchases([]);
    if (!userId) {
      setPurchasesLoading(false);
      return;
    }
    let active = true;
    setPurchasesLoading(true);
    fetchMyPurchases(userId)
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
  }, [userId]);

  const refetchPurchases = useCallback(async (): Promise<PurchaseRecord[]> => {
    if (!userId) return [];
    const list = await fetchMyPurchases(userId);
    setPurchases(list);
    return list;
  }, [userId]);

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
    setState((prev) => ({
      ...prev,
      followed: prev.followed.includes(creatorId)
        ? prev.followed.filter((id) => id !== creatorId)
        : [...prev.followed, creatorId],
    }));
  }, []);

  const purchase = useCallback(
    (productId: string) => {
      setState((prev) => {
        if (prev.collection.some((entry) => entry.productId === productId)) return prev;
        const product = supabaseProducts.find((p) => p.id === productId);
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
    },
    [supabaseProducts]
  );

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
      pendingWelcomeRef.current = data.user.id;
      setUser(toAuthUser(data.user));
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
      if (!userId) return { ok: false, error: "You must be logged in." };

      const payload: Record<string, string | null> = {};
      if (updates.username !== undefined) payload.username = updates.username.trim();
      if (updates.displayName !== undefined) payload.display_name = updates.displayName?.trim() || null;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
      if (updates.bio !== undefined) payload.bio = updates.bio;

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId)
        .select(PROFILE_COLUMNS)
        .single();

      if (error) {
        // Postgres unique_violation on the username column.
        if (error.code === "23505") return { ok: false, error: "That username is already taken." };
        return { ok: false, error: error.message };
      }
      setProfile(mapProfileRow(data as ProfileRow));
      return { ok: true };
    },
    [userId]
  );

  // Storage first, then the profiles row: if saving the URL fails, the just-uploaded
  // file is removed again so failed attempts don't leave orphaned images behind.
  const uploadProfileAvatar = useCallback(
    async (file: File): Promise<AuthResult> => {
      if (!userId) return { ok: false, error: "You must be logged in." };
      const invalid = validateAvatar(file);
      if (invalid) return { ok: false, error: invalid };

      let uploaded: { path: string; publicUrl: string };
      try {
        uploaded = await uploadAvatar(userId, file);
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Couldn't upload that image." };
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: uploaded.publicUrl })
        .eq("id", userId)
        .select(PROFILE_COLUMNS)
        .single();
      if (error) {
        await removeAvatarFile(uploaded.path);
        return { ok: false, error: error.message };
      }
      setProfile(mapProfileRow(data as ProfileRow));
      void pruneOldAvatars(userId, uploaded.path);
      return { ok: true };
    },
    [userId]
  );

  const removeProfileAvatar = useCallback(async (): Promise<AuthResult> => {
    if (!userId) return { ok: false, error: "You must be logged in." };
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) return { ok: false, error: error.message };
    setProfile(mapProfileRow(data as ProfileRow));
    void pruneOldAvatars(userId, "");
    return { ok: true };
  }, [userId]);

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

  // Comments/reviews are still stored per-account in this browser only (not yet
  // in Supabase); what they now carry is the signed-in user's real name.
  const authorName = profile?.displayName?.trim() || profile?.username || user?.username || "Member";

  const addComment = useCallback(
    (targetId: string, body: string, parentId: string | null = null) => {
      if (!body.trim()) return;
      setState((prev) => {
        const comment: CommentEntry = {
          id: `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          targetId,
          authorName,
          body: body.trim(),
          createdAt: new Date().toISOString(),
          parentId,
        };
        return { ...prev, comments: [comment, ...prev.comments] };
      });
    },
    [authorName]
  );

  const addReview = useCallback(
    (productId: string, rating: number, body: string) => {
      if (!body.trim()) return;
      setState((prev) => {
        const owned = prev.collection.some((entry) => entry.productId === productId);
        const review: Review = {
          id: `review-${Date.now().toString(36)}`,
          author: authorName,
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
    },
    [authorName]
  );

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
      uploadProfileAvatar,
      removeProfileAvatar,
      getCreator,
      hydrated,
      toggleLike,
      toggleSave,
      toggleFollow,
      purchase,
      supabaseProducts,
      myProducts,
      productsLoading,
      productsError,
      createSupabaseProduct,
      purchases,
      purchasesLoading,
      refetchPurchases,
      supabasePosts,
      myPosts,
      postsLoading,
      createSupabasePost,
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
      uploadProfileAvatar,
      removeProfileAvatar,
      getCreator,
      hydrated,
      toggleLike,
      toggleSave,
      toggleFollow,
      purchase,
      supabaseProducts,
      myProducts,
      productsLoading,
      productsError,
      createSupabaseProduct,
      purchases,
      purchasesLoading,
      refetchPurchases,
      supabasePosts,
      myPosts,
      postsLoading,
      createSupabasePost,
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
