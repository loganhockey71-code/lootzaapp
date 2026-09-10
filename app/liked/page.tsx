"use client";

import { Heart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductGrid } from "@/components/product/ProductGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppState } from "@/lib/state/AppStateContext";
import { useAllProducts } from "@/lib/hooks/useAllProducts";

export default function LikedPage() {
  const { liked } = useAppState();
  const allProducts = useAllProducts();
  const items = allProducts.filter((p) => liked.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        icon={Heart}
        title="Liked"
        subtitle={`${items.length} product${items.length === 1 ? "" : "s"} you've liked.`}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing liked yet"
          body="Tap the heart on any product to save it here."
          actionLabel="Discover products"
          actionHref="/discover"
        />
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  );
}
