"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Download, Loader2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductArtwork } from "./ProductArtwork";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { Button } from "@/components/ui/Button";
import { getCreatorById } from "@/lib/data/creators";
import { calculateRarity } from "@/lib/rarity";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { requestDownloadUrl } from "@/lib/supabase/download";

const RARITY_RING: Record<string, string> = {
  common: "ring-border",
  uncommon: "ring-emerald-300",
  rare: "ring-blue-300",
  epic: "ring-purple-300",
  legendary: "ring-accent-400",
};

export function CollectibleCard({ product, purchasedAt }: { product: Product; purchasedAt: string }) {
  const creator = getCreatorById(product.creatorId);
  const allProducts = useAllProducts();
  const rarity = calculateRarity(product, allProducts);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const date = new Date(purchasedAt);

  async function handleDownload() {
    // Mock/seed products have no real file in Storage — keep the old fake-toggle behavior for them.
    if (!product.productFilePath) {
      setDownloaded(true);
      return;
    }
    setDownloading(true);
    setDownloadError(null);
    const result = await requestDownloadUrl(product.id);
    setDownloading(false);
    if (!result.ok) {
      setDownloadError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
    setDownloaded(true);
  }

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-card ring-2 transition-all hover:-translate-y-1 hover:shadow-card-hover ${RARITY_RING[rarity]}`}
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-square w-full">
        <ProductArtwork
          product={product}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        />
        <div className="absolute left-2 top-2">
          <RarityBadge rarity={rarity} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-display text-sm font-bold text-ink">{product.title}</h3>
        <p className="text-xs text-ink-soft">By {creator?.name}</p>
        <p className="text-[11px] text-ink-soft">
          Collected {date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <Button
          size="sm"
          variant={downloaded ? "secondary" : "primary"}
          className="mt-auto w-full gap-1.5"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden /> Preparing…
            </>
          ) : downloaded ? (
            <>
              <Check size={14} aria-hidden /> Downloaded
            </>
          ) : (
            <>
              <Download size={14} aria-hidden /> Download
            </>
          )}
        </Button>
        {downloadError && <p className="text-[11px] font-medium text-red-600">{downloadError}</p>}
      </div>
    </div>
  );
}
