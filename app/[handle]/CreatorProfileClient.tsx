"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Plus, Award, Video, ImageIcon, Heart } from "lucide-react";
import type { Creator, FeedPost, Product } from "@/lib/types";
import { useAppState } from "@/lib/state/AppStateContext";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { earnedBadges, sellerTierForLevel } from "@/lib/creators";
import { xpThresholdForLevel } from "@/lib/leveling";
import { Button } from "@/components/ui/Button";
import { XPBar } from "@/components/ui/XPBar";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductGrid } from "@/components/product/ProductGrid";
import { BADGE_ICONS } from "@/lib/icons";
import { getCosmetic } from "@/lib/data/cosmetics";
import { hashSeed, formatCompactNumber } from "@/lib/utils";

const BANNER_PALETTE: [string, string][] = [
  ["#7c3aed", "#ec4899"],
  ["#3b82f6", "#7c3aed"],
  ["#f5810a", "#ec4899"],
  ["#14b8a6", "#3b82f6"],
  ["#a855f7", "#f5810a"],
];

const TABS = [
  { id: "products", label: "Products" },
  { id: "posts", label: "Posts" },
  { id: "about", label: "About" },
];

export function CreatorProfileClient({
  creator,
  products,
  posts,
  isCurrentUser,
}: {
  creator: Creator;
  /** Only this creator's own listings (already filtered by seller id). */
  products: Product[];
  /** Only this creator's own posts (already filtered by author id). */
  posts: FeedPost[];
  isCurrentUser: boolean;
}) {
  const { isFollowed, toggleFollow, equipped, level: myLevel, xp: myXp } = useAppState();
  const [tab, setTab] = useState("products");
  const following = isFollowed(creator.id);
  // The signed-in user's level/xp live in the local progression system; anyone else's
  // is whatever their profile row says.
  const level = isCurrentUser ? myLevel : creator.level;
  const xp = isCurrentUser ? myXp : creator.xp;
  const badges = earnedBadges(products);
  const [c1, c2] = BANNER_PALETTE[hashSeed(creator.avatarSeed) % BANNER_PALETTE.length];

  const totalSales = products.reduce((sum, p) => sum + p.sold, 0);
  const totalReviews = products.reduce((sum, p) => sum + p.reviewCount, 0);
  const avgRating = totalReviews > 0 ? products.reduce((sum, p) => sum + p.rating * p.reviewCount, 0) / totalReviews : 0;

  const equippedFrame = isCurrentUser && equipped.frame ? getCosmetic(equipped.frame) : undefined;
  const equippedBackground = isCurrentUser && equipped.background ? getCosmetic(equipped.background) : undefined;
  const equippedTitle = isCurrentUser && equipped.title ? getCosmetic(equipped.title) : undefined;
  const [bg1, bg2] = equippedBackground?.colors ?? [c1, c2];

  return (
    <div className="pb-16">
      <div
        className="h-40 w-full sm:h-56"
        style={{ background: `linear-gradient(120deg, ${bg1}, ${bg2})` }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="-mt-14 flex flex-col items-start gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div
              className="rounded-full"
              style={
                equippedFrame
                  ? { background: `linear-gradient(135deg, ${equippedFrame.colors[0]}, ${equippedFrame.colors[1]})`, padding: 4 }
                  : undefined
              }
            >
              {isCurrentUser ? (
                <AvatarUploader size={104} avatarClassName="border-4 border-bg text-3xl shadow-card-hover" />
              ) : (
                <CreatorAvatar
                  name={creator.name}
                  seed={creator.avatarSeed}
                  avatarUrl={creator.avatar}
                  size={104}
                  className="border-4 border-bg text-3xl shadow-card-hover"
                />
              )}
            </div>
            <div className="pb-1">
              <h1 className="flex items-center gap-1.5 font-display text-2xl font-extrabold text-ink">
                {creator.name}
              </h1>
              <p className="text-sm text-ink-soft">@{creator.handle}</p>
              {equippedTitle && (
                <span
                  className="mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ background: `linear-gradient(120deg, ${equippedTitle.colors[0]}, ${equippedTitle.colors[1]})` }}
                >
                  {equippedTitle.name.replace(" Title", "")}
                </span>
              )}
            </div>
          </div>

          {!isCurrentUser && (
            <Button
              variant={following ? "outline" : "primary"}
              onClick={() => toggleFollow(creator.id)}
              className="mb-1 gap-1.5"
            >
              {following ? (
                <>
                  <Check size={16} aria-hidden /> Following
                </>
              ) : (
                <>
                  <Plus size={16} aria-hidden /> Follow
                </>
              )}
            </Button>
          )}
          {isCurrentUser && (
            <Link href="/dashboard" className="mb-1">
              <Button variant="outline">Seller Dashboard</Button>
            </Link>
          )}
        </div>

        {creator.bio && <p className="mt-4 max-w-xl text-ink-soft">{creator.bio}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
            <Award size={14} aria-hidden /> Level {level} · {sellerTierForLevel(level)}
          </span>
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.id];
            return (
              <span
                key={badge.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink-soft ring-1 ring-border"
                title={badge.label}
              >
                <Icon size={14} aria-hidden /> {badge.label}
              </span>
            );
          })}
        </div>

        <div className="mt-5 max-w-sm">
          <XPBar xp={xp} xpToNextLevel={xpThresholdForLevel(level)} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card sm:grid-cols-4">
          <Stat label="Products" value={String(products.length)} />
          <Stat label="Sales" value={formatCompactNumber(totalSales)} />
          <Stat label="Rating" value={avgRating > 0 ? avgRating.toFixed(1) : "—"} />
          <Stat label="Joined" value={creator.joined || "—"} />
        </div>

        <Tabs tabs={TABS} activeId={tab} onChange={setTab} className="mt-8 border-b border-border pb-4" />

        <div className="mt-6">
          {tab === "products" ? (
            <ProductGrid
              products={products}
              emptyTitle="No products yet"
              emptyBody={`${creator.name} hasn't dropped anything yet. Check back soon.`}
            />
          ) : tab === "posts" ? (
            posts.length === 0 ? (
              <EmptyState
                title="No posts yet"
                body={`${creator.name} hasn't shared any updates yet. Check back soon.`}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {posts.map((post) => {
                  const linkedProduct = post.linkedProductId
                    ? products.find((p) => p.id === post.linkedProductId)
                    : null;
                  return (
                    <Link
                      key={post.id}
                      href={linkedProduct ? `/product/${linkedProduct.slug}` : `/discover?q=${encodeURIComponent(post.caption)}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card transition-colors hover:border-ink/15"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-soft">
                        {post.type === "video" ? <Video size={16} aria-hidden /> : <ImageIcon size={16} aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm text-ink">{post.caption || "Untitled post"}</p>
                        <p className="text-xs text-ink-soft">{post.postedAt}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-ink-soft">
                        <Heart size={13} aria-hidden /> {formatCompactNumber(post.likes)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )
          ) : (
            <div className="max-w-2xl space-y-4 text-ink-soft">
              <p>{creator.bio || `${creator.name} has not added a bio yet.`}</p>
              <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
                <p className="font-semibold text-ink">Member since</p>
                <p>{creator.joined || "—"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-lg font-extrabold text-ink">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}
