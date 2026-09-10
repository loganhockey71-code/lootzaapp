"use client";

import Link from "next/link";
import { Heart, Package, BadgeCheck } from "lucide-react";
import { getCreatorById } from "@/lib/data/creators";
import type { Product } from "@/lib/types";
import { useAppState } from "@/lib/state/AppStateContext";
import { cn, discountPercent, formatCompactNumber, formatPrice } from "@/lib/utils";
import { ProductArtwork } from "./ProductArtwork";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { calculateRarity } from "@/lib/rarity";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { CountdownTimer } from "./CountdownTimer";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const creator = getCreatorById(product.creatorId);
  const { isLiked, toggleLike, isPromoted } = useAppState();
  const allProducts = useAllProducts();
  const rarity = calculateRarity(product, allProducts);
  const liked = isLiked(product.id);
  const discount = discountPercent(product.price, product.originalPrice);
  const sponsored = isPromoted(product.id);

  if (!creator) return null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-border transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover">
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/3] w-full">
        <ProductArtwork
          product={product}
          priority={priority}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            {product.badge && <Badge tone={product.badge} />}
            {product.drop && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                {product.drop.tag === "limited" ? "Limited" : "Event"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleLike(product.id);
            }}
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base shadow-sm backdrop-blur transition-transform active:scale-90"
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart size={16} className={cn(liked ? "fill-red-500 text-red-500" : "text-ink-soft")} aria-hidden />
          </button>
        </div>

        <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-ink-soft shadow-sm backdrop-blur">
          <Package size={16} aria-hidden />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {sponsored && <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft/70">Sponsored</span>}
        <Link
          href={`/@${creator.handle}`}
          className="flex items-center gap-2 text-xs text-ink-soft hover:text-ink"
        >
          <CreatorAvatar name={creator.name} seed={creator.avatarSeed} avatarUrl={creator.avatar} size={20} />
          <span className="font-medium text-ink">{creator.name}</span>
          {creator.verified && <BadgeCheck size={14} className="text-blue-500" aria-hidden />}
          <span className="ml-auto shrink-0">{product.postedAt}</span>
        </Link>

        <Link href={`/product/${product.slug}`} className="block">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <RarityBadge rarity={rarity} />
          </div>
          <h3 className="line-clamp-1 font-display text-[15px] font-bold text-ink">{product.title}</h3>
          <p className="line-clamp-1 text-sm text-ink-soft">{product.tagline}</p>
        </Link>

        {product.drop && (
          <div className="rounded-lg bg-red-50 px-2.5 py-1.5">
            <CountdownTimer endsAt={product.drop.endsAt} className="text-red-600" />
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-red-100">
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${Math.max(4, (product.drop.quantityRemaining / product.drop.quantityTotal) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {product.limitedQuantity && (
          <div className="rounded-lg bg-accent-50 px-2.5 py-1.5">
            <span className="text-xs font-bold text-accent-600">
              {product.limitedQuantity.remaining} of {product.limitedQuantity.total} left
            </span>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-accent-500/20">
              <div
                className="h-full rounded-full bg-accent-500"
                style={{
                  width: `${Math.max(4, (product.limitedQuantity.remaining / product.limitedQuantity.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {product.releaseAt && (
          <div className="rounded-lg bg-surface-2 px-2.5 py-1.5">
            <CountdownTimer
              endsAt={product.releaseAt}
              className="text-ink-soft"
              suffix="until release"
              endedLabel="Just released"
            />
          </div>
        )}

        <div className="mt-auto flex items-end justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-ink">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-xs text-ink-soft line-through">{formatPrice(product.originalPrice)}</span>
            )}
            {discount && (
              <span className="rounded-full bg-accent-50 px-1.5 py-0.5 text-[11px] font-bold text-accent-600">
                -{discount}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-ink-soft">
            <Heart size={13} className={cn(liked && "fill-red-500 text-red-500")} aria-hidden />
            {formatCompactNumber(product.likes + (liked ? 1 : 0))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-soft">
          <StarRating rating={product.rating} />
          <span>({product.reviewCount}) · {formatCompactNumber(product.sold)} sold</span>
        </div>
      </div>
    </div>
  );
}
