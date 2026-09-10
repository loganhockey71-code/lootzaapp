"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Bookmark, Share2, ShoppingBag, BadgeCheck, MessageCircle } from "lucide-react";
import type { Product } from "@/lib/types";
import { getCreatorById } from "@/lib/data/creators";
import { useAppState } from "@/lib/state/AppStateContext";
import { formatCompactNumber, formatPrice } from "@/lib/utils";
import { useInView } from "@/lib/hooks/useInView";
import { ProductVideoBackground } from "./ProductVideoBackground";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { Badge } from "@/components/ui/Badge";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { BuyModal } from "./BuyModal";
import { calculateRarity } from "@/lib/rarity";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { CommentSheet } from "@/components/social/CommentSheet";
import { CountdownTimer } from "./CountdownTimer";
import { RailButton } from "@/components/feed/FeedRailButton";

export function ProductVideoCard({ product }: { product: Product }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.65);
  const { isLiked, toggleLike, isSaved, toggleSave, recordWatch, recordClick, commentsFor } = useAppState();
  const allProducts = useAllProducts();
  const rarity = calculateRarity(product, allProducts);
  const [buyOpen, setBuyOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const creator = getCreatorById(product.creatorId);

  const liked = isLiked(product.id);
  const saved = isSaved(product.id);
  const commentCount = commentsFor(product.id).length;

  useEffect(() => {
    if (inView) recordWatch(product.id);
  }, [inView, product.id, recordWatch]);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(`${window.location.origin}/product/${product.slug}`)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {});
    }
  }

  if (!creator) return null;

  return (
    <div ref={ref} className="snap-card relative h-full w-full shrink-0 lg:flex lg:items-stretch lg:gap-4">
      <div className="relative h-full w-full overflow-hidden bg-ink sm:rounded-3xl lg:max-w-[560px] lg:shrink-0 lg:rounded-3xl lg:shadow-card-hover">
        <ProductVideoBackground product={product} active={inView} />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
        />

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <RarityBadge rarity={rarity} />
          {product.badge && <Badge tone={product.badge} />}
          {product.drop && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
              {product.drop.tag === "limited" ? "Limited" : "Event"}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2 text-white">
            <Link href={`/@${creator.handle}`} className="flex items-center gap-2 text-sm">
              <CreatorAvatar name={creator.name} seed={creator.avatarSeed} avatarUrl={creator.avatar} size={30} />
              <span className="font-semibold">{creator.name}</span>
              {creator.verified && <BadgeCheck size={15} className="text-primary-300" aria-hidden />}
            </Link>

            <Link href={`/product/${product.slug}`} onClick={() => recordClick(product.id)}>
              <h2 className="font-display line-clamp-1 text-lg font-extrabold sm:text-xl">{product.title}</h2>
              <p className="line-clamp-2 text-sm text-white/85">{product.tagline}</p>
            </Link>

            {product.drop && <CountdownTimer endsAt={product.drop.endsAt} className="text-accent-400" />}

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="font-display text-xl font-extrabold">{formatPrice(product.price)}</span>
              <Link
                href={`/product/${product.slug}`}
                onClick={() => recordClick(product.id)}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white/90"
              >
                View Product
              </Link>
              <button
                type="button"
                onClick={() => setBuyOpen(true)}
                className="hidden items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 lg:inline-flex"
              >
                <ShoppingBag size={15} aria-hidden /> Buy
              </button>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-4 pb-1 lg:hidden">
            <RailButton icon={Heart} label={formatCompactNumber(product.likes + (liked ? 1 : 0))} active={liked} onClick={() => toggleLike(product.id)} />
            <RailButton icon={Bookmark} label={saved ? "Saved" : "Save"} active={saved} onClick={() => toggleSave(product.id)} />
            <RailButton icon={MessageCircle} label={commentCount > 0 ? formatCompactNumber(commentCount) : "Comment"} onClick={() => setCommentsOpen(true)} />
            <RailButton icon={Share2} label={copied ? "Copied" : "Share"} onClick={handleShare} />
            <RailButton icon={ShoppingBag} label="Buy" onClick={() => setBuyOpen(true)} />
          </div>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col justify-center gap-3 lg:flex">
        <RailButton theme="light" icon={Heart} label={formatCompactNumber(product.likes + (liked ? 1 : 0))} active={liked} onClick={() => toggleLike(product.id)} />
        <RailButton theme="light" icon={MessageCircle} label={commentCount > 0 ? formatCompactNumber(commentCount) : "Comment"} onClick={() => setCommentsOpen(true)} />
        <RailButton theme="light" icon={Bookmark} label={saved ? "Saved" : "Save"} active={saved} onClick={() => toggleSave(product.id)} />
        <RailButton theme="light" icon={Share2} label={copied ? "Copied" : "Share"} onClick={handleShare} />
      </div>

      <BuyModal product={product} open={buyOpen} onClose={() => setBuyOpen(false)} />
      <CommentSheet targetId={product.id} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </div>
  );
}
