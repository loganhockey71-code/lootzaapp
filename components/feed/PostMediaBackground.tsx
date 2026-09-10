"use client";

import { useEffect, useRef, useState } from "react";
import type { CategorySlug, FeedPost } from "@/lib/types";
import { ProductArtwork } from "@/components/product/ProductArtwork";
import { pickFrom } from "@/lib/utils";
import { cn } from "@/lib/utils";

const FALLBACK_CATEGORIES: CategorySlug[] = ["gaming", "graphics", "social", "web", "creator", "ai"];

/**
 * Renders a feed post's media: a real video, a real image (data/blob URL), or
 * — if neither loads (or none was ever attached) — the same generated cover
 * art used for products, so a stale blob URL never shows a broken frame.
 */
export function PostMediaBackground({ post, active }: { post: FeedPost; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active]);

  const category = post.category ?? pickFrom(post.creatorId, FALLBACK_CATEGORIES);
  const artwork = {
    coverImage: null,
    coverSeed: post.coverSeed,
    category,
    title: post.caption,
  };

  if (!post.mediaUrl || failed) {
    return (
      <div className="h-full w-full overflow-hidden">
        <ProductArtwork
          product={artwork}
          priority
          className={cn("kenburns h-full w-full object-cover", active && "is-active")}
        />
      </div>
    );
  }

  if (post.type === "video") {
    return (
      <video
        ref={videoRef}
        src={post.mediaUrl}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- locally captured data/blob URL, not an optimizable remote asset
    <img
      src={post.mediaUrl}
      alt={post.caption}
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
