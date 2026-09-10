"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/types";
import { ProductArtwork } from "./ProductArtwork";
import { cn } from "@/lib/utils";

/**
 * Fills the Discover feed card with real footage when `product.videoUrl` is
 * set; otherwise falls back to the generated cover art with a slow pan/zoom
 * standing in for motion. `active` drives play/pause either way, so only the
 * card centered in view is ever "playing" — matching a real video feed.
 */
export function ProductVideoBackground({ product, active }: { product: Product; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.play().catch(() => {
        // Autoplay can be rejected before the user has interacted with the page — harmless here.
      });
    } else {
      video.pause();
    }
  }, [active]);

  if (product.videoUrl) {
    return (
      <video
        ref={videoRef}
        src={product.videoUrl}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <ProductArtwork
        product={product}
        priority
        className={cn("kenburns h-full w-full object-cover", active && "is-active")}
      />
    </div>
  );
}
