"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowRight,
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  PiggyBank,
  Rocket,
  Headphones,
  Video,
  ListChecks,
  Coins,
  Pause,
  Play,
  Megaphone,
  Check,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { challenges } from "@/lib/data/challenges";
import { useAppState } from "@/lib/state/AppStateContext";
import { fetchMySales, type PurchaseRecord } from "@/lib/supabase/purchases";
import { earnedBadges, sellerTierForLevel } from "@/lib/creators";
import { xpThresholdForLevel } from "@/lib/leveling";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { XPBar } from "@/components/ui/XPBar";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { PromoteModal } from "@/components/product/PromoteModal";
import { PayoutStatusBanner } from "@/components/sell/PayoutStatusBanner";
import { BADGE_ICONS } from "@/lib/icons";
import { formatCompactNumber, formatPrice } from "@/lib/utils";
import { RevenueChart } from "./RevenueChart";

export default function DashboardPage() {
  const {
    myProducts,
    myPosts,
    coins,
    level,
    xp,
    challengeProgress,
    promotions,
    togglePromotionPause,
    leaderboardBadges,
    user,
    profile,
  } = useAppState();
  // Everything below is scoped to the signed-in account: myProducts/myPosts are the
  // rows whose seller_id/author_id equals THIS user's auth id, and sales are read
  // through a policy that only returns rows where this user is the seller. Nothing
  // here comes from a shared or demo catalog.
  const products = myProducts;
  const displayName = profile?.displayName?.trim() || profile?.username || user?.username || "";
  const handle = profile?.username ?? user?.username ?? "";
  const myVideoPosts = myPosts.filter((p) => p.type === "video");

  // This seller's real completed sales (drives revenue + the 7-day chart).
  const [sales, setSales] = useState<PurchaseRecord[]>([]);
  const userId = user?.id ?? null;
  useEffect(() => {
    // Never show another account's sales while this account's are loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSales([]);
    if (!userId) return;
    let active = true;
    fetchMySales(userId)
      .then((list) => {
        if (active) setSales(list);
      })
      .catch((err: Error) => console.error("Failed to load sales:", err.message));
    return () => {
      active = false;
    };
  }, [userId]);
  const [promoteOpen, setPromoteOpen] = useState(false);

  // Views/clicks/saves aren't tracked for real listings yet, so they're shown as "—"
  // rather than invented. Revenue comes from the seller's actual completed purchases.
  const revenueByProduct = new Map<string, number>();
  for (const sale of sales) {
    revenueByProduct.set(sale.productId, (revenueByProduct.get(sale.productId) ?? 0) + sale.price);
  }
  const rows = products
    .map((p) => ({
      product: p,
      revenue: revenueByProduct.get(p.id) ?? 0,
      views: null as number | null,
      clicks: null as number | null,
      saves: null as number | null,
      conversion: null as number | null,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = sales.reduce((sum, s) => sum + s.price, 0);
  const totalSales = products.reduce((sum, p) => sum + p.sold, 0);
  const completedChallenges = Object.values(challengeProgress).filter((c) => c.completedAt).length;
  const unclaimedChallenges = Object.entries(challengeProgress).filter(
    ([, p]) => p.completedAt && !p.claimed
  ).length;

  // Real revenue for each of the last 7 calendar days, oldest first.
  const dayStarts = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const revenueSeries = dayStarts.map((start) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return sales
      .filter((s) => {
        const t = new Date(s.createdAt).getTime();
        return t >= start.getTime() && t < end.getTime();
      })
      .reduce((sum, s) => sum + s.price, 0);
  });
  const days = dayStarts.map((d) => d.toLocaleDateString("en-US", { weekday: "short" }));

  // Trend deltas (e.g. "+18.6%") were previously hardcoded on every tile
  // regardless of any actual change over time — removed rather than
  // replaced, since there's no real day-over-day baseline to compute a
  // genuine one from yet.
  const stats: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "Total Revenue", value: formatPrice(totalRevenue), icon: DollarSign },
    { label: "Sales", value: formatCompactNumber(totalSales), icon: ShoppingBag },
    { label: "Products", value: formatCompactNumber(products.length), icon: Package },
    { label: "Posts", value: formatCompactNumber(myPosts.length), icon: Video },
    { label: "Coins", value: formatCompactNumber(coins), icon: Coins },
  ];
  const badges = earnedBadges(products);
  const xpToNextLevel = xpThresholdForLevel(level);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <AvatarUploader size={64} />
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Welcome back, {displayName}!</h1>
            <p className="text-sm text-ink-soft">Here&apos;s what&apos;s happening with your store today.</p>
          </div>
        </div>
        <Link href="/sell">
          <Button className="gap-1.5">
            <Plus size={16} aria-hidden /> New Drop
          </Button>
        </Link>
      </div>

      {products.length > 0 && <PayoutStatusBanner />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ink-soft">
              <s.icon size={16} aria-hidden />
            </span>
            <p className="mt-2 font-display text-xl font-extrabold text-ink">{s.value}</p>
            <p className="text-xs text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-bold text-ink">Revenue Overview</h2>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-soft">
              Last 7 days
            </span>
          </div>
          <RevenueChart points={revenueSeries} />
          <div className="mt-2 flex justify-between text-xs text-ink-soft">
            {days.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-bold text-ink">Seller Level</h2>
            <span className="rounded-full bg-primary-600 px-2.5 py-1 text-xs font-bold text-white">
              Level {level}
            </span>
          </div>
          <p className="font-display text-lg font-extrabold text-ink">{sellerTierForLevel(level)}</p>
          <div className="mt-3">
            <XPBar xp={xp} xpToNextLevel={xpToNextLevel} />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            You&apos;re {formatCompactNumber(xpToNextLevel - xp)} XP away from Level {level + 1}!
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary-500" aria-hidden /> Higher product visibility
            </li>
            <li className="flex items-center gap-2">
              <PiggyBank size={14} className="text-primary-500" aria-hidden /> Lower marketplace fees
            </li>
            <li className="flex items-center gap-2">
              <Rocket size={14} className="text-primary-500" aria-hidden /> Early access to new features
            </li>
            <li className="flex items-center gap-2">
              <Headphones size={14} className="text-primary-500" aria-hidden /> Priority support
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-bold text-ink">Top Performing Products</h2>
          <Link href={`/@${handle}`} className="text-sm font-semibold text-ink-soft hover:text-ink">
            View All Products
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">
            You haven&apos;t dropped anything yet.{" "}
            <Link href="/sell" className="inline-flex items-center gap-1 font-semibold text-ink hover:text-ink-soft">
              Drop your first product <ArrowRight size={14} aria-hidden />
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
                  <th className="py-2 font-semibold">Product</th>
                  <th className="py-2 font-semibold">Views</th>
                  <th className="py-2 font-semibold">Clicks</th>
                  <th className="py-2 font-semibold">Saves</th>
                  <th className="py-2 font-semibold">Sales</th>
                  <th className="py-2 font-semibold">Revenue</th>
                  <th className="py-2 font-semibold">Conversion</th>
                  <th className="py-2 font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product, views, clicks, saves, revenue, conversion }) => (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="py-3">
                      <Link href={`/product/${product.slug}`} className="font-semibold text-ink hover:text-ink-soft">
                        {product.title}
                      </Link>
                    </td>
                    <td className="py-3 text-ink-soft">{views != null ? formatCompactNumber(views) : "—"}</td>
                    <td className="py-3 text-ink-soft">{clicks != null ? formatCompactNumber(clicks) : "—"}</td>
                    <td className="py-3 text-ink-soft">{saves != null ? formatCompactNumber(saves) : "—"}</td>
                    <td className="py-3 text-ink-soft">{formatCompactNumber(product.sold)}</td>
                    <td className="py-3 font-semibold text-ink">{formatPrice(revenue)}</td>
                    <td className="py-3 text-ink-soft">{conversion != null ? `${conversion.toFixed(2)}%` : "—"}</td>
                    <td className="py-3">
                      {product.reviewCount > 0 ? <StarRating rating={product.rating} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 font-bold text-ink">
            <Megaphone size={16} className="text-ink-soft" aria-hidden /> Promotions
          </h2>
          <Button size="sm" className="gap-1.5" onClick={() => setPromoteOpen(true)} disabled={products.length === 0}>
            <Rocket size={14} aria-hidden /> Promote a Product
          </Button>
        </div>
        {promotions.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">
            No active campaigns yet. Promote a listing to boost its visibility in Discover.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
                  <th className="py-2 font-semibold">Product</th>
                  <th className="py-2 font-semibold">Method</th>
                  <th className="py-2 font-semibold">Daily Budget</th>
                  <th className="py-2 font-semibold">Duration</th>
                  <th className="py-2 font-semibold">Spent / Total</th>
                  <th className="py-2 font-semibold">Views</th>
                  <th className="py-2 font-semibold">Clicks</th>
                  <th className="py-2 font-semibold">Sales</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => {
                  const promoProduct = products.find((p) => p.id === promo.productId);
                  const completed = promo.spent >= promo.budget;
                  const status = completed ? "Completed" : promo.paused ? "Paused" : "Active";
                  const statusClass = completed
                    ? "bg-surface-2 text-ink-soft"
                    : promo.paused
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700";
                  const currency = promo.method === "cash" ? "$" : "";
                  const suffix = promo.method === "coins" ? " coins" : "";
                  return (
                    <tr key={promo.id} className="border-b border-border last:border-0">
                      <td className="py-3 font-semibold text-ink">{promoProduct?.title ?? "Deleted listing"}</td>
                      <td className="py-3 text-ink-soft">{promo.method === "coins" ? "Lootza Coins" : "Real Money"}</td>
                      <td className="py-3 text-ink-soft">
                        {currency}
                        {promo.dailyBudget.toLocaleString()}
                        {suffix}/day
                      </td>
                      <td className="py-3 text-ink-soft">{promo.durationDays} days</td>
                      <td className="py-3 text-ink-soft">
                        {currency}
                        {promo.spent.toLocaleString()} / {currency}
                        {promo.budget.toLocaleString()}
                        {suffix}
                      </td>
                      <td className="py-3 text-ink-soft">{formatCompactNumber(promo.views)}</td>
                      <td className="py-3 text-ink-soft">{formatCompactNumber(promo.clicks)}</td>
                      <td className="py-3 text-ink-soft">{formatCompactNumber(promo.sales)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}>{status}</span>
                      </td>
                      <td className="py-3 text-right">
                        {!completed && (
                          <button
                            type="button"
                            onClick={() => togglePromotionPause(promo.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink"
                            aria-label={promo.paused ? "Resume campaign" : "Pause campaign"}
                          >
                            {promo.paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PromoteModal open={promoteOpen} onClose={() => setPromoteOpen(false)} products={products} />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 font-bold text-ink">
              <Video size={16} className="text-ink-soft" aria-hidden /> Video Performance
            </h2>
            <Link href="/discover" className="text-sm font-semibold text-ink-soft hover:text-ink">
              View Discover
            </Link>
          </div>
          {myVideoPosts.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">
              You haven&apos;t posted any videos yet.{" "}
              <Link href="/sell" className="inline-flex items-center gap-1 font-semibold text-ink hover:text-ink-soft">
                Post a video <ArrowRight size={14} aria-hidden />
              </Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {myVideoPosts.map((post) => {
                return (
                  <li key={post.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
                    <p className="line-clamp-1 flex-1 text-sm font-semibold text-ink">{post.caption}</p>
                    <div className="flex shrink-0 items-center gap-4 text-xs text-ink-soft">
                      <span className="flex items-center gap-1">
                        <TrendingUp size={13} aria-hidden /> {formatCompactNumber(post.likes)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="font-display mb-3 font-bold text-ink">Progress</h2>
          <Link
            href="/wallet"
            className="mb-3 flex items-center justify-between rounded-xl bg-accent-500 px-4 py-3 text-white transition-colors hover:bg-accent-600 active:scale-[0.98]"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Coins size={16} aria-hidden /> Lootza Coins
            </span>
            <span className="font-display text-lg font-extrabold">{formatCompactNumber(coins)}</span>
          </Link>
          <Link
            href="/challenges"
            className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 transition-colors hover:bg-blue-100"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ListChecks size={16} className="text-blue-600" aria-hidden /> Challenges
            </span>
            <span className="text-right text-xs text-ink-soft">
              <span className="block font-semibold text-ink">{completedChallenges}/{challenges.length} complete</span>
              {unclaimedChallenges > 0 && (
                <span className="text-blue-600">{unclaimedChallenges} ready to claim</span>
              )}
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display mb-4 font-bold text-ink">Achievements</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.id];
            return (
              <div key={badge.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
                  <Icon size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-ink">{badge.label}</p>
                  <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <Check size={12} aria-hidden /> Earned
                  </p>
                </div>
              </div>
            );
          })}
          {leaderboardBadges.map((label, i) => (
            <div key={`${label}-${i}`} className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
                <Trophy size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-ink">{label}</p>
                <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check size={12} aria-hidden /> Leaderboard
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
