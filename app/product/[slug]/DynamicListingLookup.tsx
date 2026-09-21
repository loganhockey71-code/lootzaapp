"use client";

import { notFound } from "next/navigation";
import { useAppState } from "@/lib/state/AppStateContext";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { unknownCreator } from "@/lib/creators";
import { ProductDetailClient } from "./ProductDetailClient";

/**
 * Resolves a product page's slug to its real Supabase listing client-side, once
 * both local state and the products fetch have settled.
 */
export function DynamicListingLookup({ slug }: { slug: string }) {
  const { hydrated, productsLoading, getCreator } = useAppState();
  const allProducts = useAllProducts();

  if (!hydrated || productsLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
          <div className="animate-shimmer aspect-[16/10] w-full rounded-3xl bg-gradient-to-r from-surface-2 via-border to-surface-2" />
          <div className="flex flex-col gap-3">
            <div className="animate-shimmer h-6 w-3/4 rounded-full bg-gradient-to-r from-surface-2 via-border to-surface-2" />
            <div className="animate-shimmer h-4 w-1/2 rounded-full bg-gradient-to-r from-surface-2 via-border to-surface-2" />
            <div className="animate-shimmer h-11 w-full rounded-full bg-gradient-to-r from-surface-2 via-border to-surface-2" />
          </div>
        </div>
      </div>
    );
  }

  const product = allProducts.find((p) => p.slug === slug);
  if (!product) notFound();

  const creator = getCreator(product.creatorId) ?? unknownCreator(product.creatorId);
  const related = allProducts.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 6);

  return <ProductDetailClient product={product} creator={creator} related={related} />;
}
