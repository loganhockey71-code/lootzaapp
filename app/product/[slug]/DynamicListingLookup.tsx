"use client";

import { notFound } from "next/navigation";
import { useAppState } from "@/lib/state/AppStateContext";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { getCreatorById } from "@/lib/data/creators";
import { getProductsByCategory } from "@/lib/data/products";
import { ProductDetailClient } from "./ProductDetailClient";

/**
 * Products created through the /sell/product wizard (real Supabase listings, or
 * locally-created ones) don't exist in the seed catalog the server component's
 * generateStaticParams knows about, so they can't be resolved there. This looks
 * them up client-side once both local state and the Supabase products fetch
 * have settled.
 */
export function DynamicListingLookup({ slug }: { slug: string }) {
  const { hydrated, productsLoading } = useAppState();
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

  const creator = getCreatorById(product.creatorId)!;
  const related = getProductsByCategory(product.category).slice(0, 6);

  return <ProductDetailClient product={product} creator={creator} related={related} />;
}
