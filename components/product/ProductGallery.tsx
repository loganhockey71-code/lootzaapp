"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { ProductArtwork } from "./ProductArtwork";
import { cn } from "@/lib/utils";

export function ProductGallery({ product }: { product: Product }) {
  const seeds = product.gallerySeeds.length > 0 ? product.gallerySeeds : [product.coverSeed];
  const [active, setActive] = useState(0);

  const activeArtwork = { ...product, coverSeed: seeds[active] };

  return (
    <div>
      <div className="overflow-hidden rounded-3xl shadow-card">
        <ProductArtwork product={activeArtwork} priority className="aspect-[16/10] w-full object-cover" />
      </div>
      {seeds.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {seeds.map((seed, i) => (
            <button
              key={seed}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition-all",
                active === i ? "ring-primary-600" : "ring-transparent opacity-70 hover:opacity-100"
              )}
            >
              <ProductArtwork product={{ ...product, coverSeed: seed }} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
