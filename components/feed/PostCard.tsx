"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Bookmark, Share2, ShoppingBag, BadgeCheck, MessageCircle, Video, Users } from "lucide-react";
import type { FeedPost } from "@/lib/types";
import { getCreatorById } from "@/lib/data/creators";
import { useAppState } from "@/lib/state/AppStateContext";
import { formatCompactNumber, formatPrice } from "@/lib/utils";
import { useInView } from "@/lib/hooks/useInView";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { PostMediaBackground } from "./PostMediaBackground";
import { Badge } from "@/components/ui/Badge";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { BuyModal } from "@/components/product/BuyModal";
import { CommentSheet } from "@/components/social/CommentSheet";
import { HashtagText } from "@/components/social/HashtagText";
import { RailButton } from "@/components/feed/FeedRailButton";

export function PostCard({ post }: { post: FeedPost }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.65);
  const { isLiked, toggleLike, isSaved, toggleSave, recordWatch, recordClick, commentsFor } = useAppState();
  const allProducts = useAllProducts();
  const [buyOpen, setBuyOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const creator = getCreatorById(post.creatorId);
  const collaborator = post.collaboratorId ? getCreatorById(post.collaboratorId) : null;
  const linkedProduct = post.linkedProductId ? allProducts.find((p) => p.id === post.linkedProductId) ?? null : null;

  const liked = isLiked(post.id);
  const saved = isSaved(post.id);
  const commentCount = commentsFor(post.id).length;

  useEffect(() => {
    if (inView) recordWatch(post.id);
  }, [inView, post.id, recordWatch]);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(`${window.location.origin}/discover`)
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
        <PostMediaBackground post={post} active={inView} />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
        />

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral" className="bg-white/15 text-white">
            {post.type === "video" ? <Video size={12} aria-hidden /> : null}
            {post.type === "video" ? "Video" : "Post"}
          </Badge>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2 text-white">
            <Link href={`/@${creator.handle}`} className="flex items-center gap-2 text-sm">
              <CreatorAvatar name={creator.name} seed={creator.avatarSeed} avatarUrl={creator.avatar} size={30} />
              <span className="font-semibold">{creator.name}</span>
              {creator.verified && <BadgeCheck size={15} className="text-primary-300" aria-hidden />}
            </Link>

            {collaborator && (
              <Link href={`/@${collaborator.handle}`} className="flex w-fit items-center gap-1.5 text-xs text-white/70 hover:text-white">
                <Users size={12} aria-hidden /> with{" "}
                <span className="font-semibold text-white/90">{collaborator.name}</span>
              </Link>
            )}

            <p className="line-clamp-2 text-sm text-white/90">
              <HashtagText text={post.caption} linkClassName="text-primary-300" />
            </p>

            {linkedProduct ? (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="font-display text-lg font-extrabold">{formatPrice(linkedProduct.price)}</span>
                <Link
                  href={`/product/${linkedProduct.slug}`}
                  onClick={() => recordClick(linkedProduct.id)}
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
            ) : (
              <Link
                href={`/@${creator.handle}`}
                className="mt-1 flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/25"
              >
                View {creator.name}&apos;s shop
              </Link>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-4 pb-1 lg:hidden">
            <RailButton icon={Heart} label={formatCompactNumber(post.likes + (liked ? 1 : 0))} active={liked} onClick={() => toggleLike(post.id)} />
            <RailButton icon={Bookmark} label={saved ? "Saved" : "Save"} active={saved} onClick={() => toggleSave(post.id)} />
            <RailButton icon={MessageCircle} label={commentCount > 0 ? formatCompactNumber(commentCount) : "Comment"} onClick={() => setCommentsOpen(true)} />
            <RailButton icon={Share2} label={copied ? "Copied" : "Share"} onClick={handleShare} />
            {linkedProduct && <RailButton icon={ShoppingBag} label="Buy" onClick={() => setBuyOpen(true)} />}
          </div>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col justify-center gap-3 lg:flex">
        <RailButton theme="light" icon={Heart} label={formatCompactNumber(post.likes + (liked ? 1 : 0))} active={liked} onClick={() => toggleLike(post.id)} />
        <RailButton theme="light" icon={MessageCircle} label={commentCount > 0 ? formatCompactNumber(commentCount) : "Comment"} onClick={() => setCommentsOpen(true)} />
        <RailButton theme="light" icon={Bookmark} label={saved ? "Saved" : "Save"} active={saved} onClick={() => toggleSave(post.id)} />
        <RailButton theme="light" icon={Share2} label={copied ? "Copied" : "Share"} onClick={handleShare} />
      </div>

      {linkedProduct && <BuyModal product={linkedProduct} open={buyOpen} onClose={() => setBuyOpen(false)} />}
      <CommentSheet targetId={post.id} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </div>
  );
}
