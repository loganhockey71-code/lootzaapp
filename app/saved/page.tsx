"use client";

import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductGrid } from "@/components/product/ProductGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppState } from "@/lib/state/AppStateContext";
import { useAllProducts } from "@/lib/hooks/useAllProducts";

export default function SavedPage() {
  const { saved } = useAppState();
  const allProducts = useAllProducts();
  const items = allProducts.filter((p) => saved.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        icon={Bookmark}
        title="Saved"
        subtitle={`${items.length} product${items.length === 1 ? "" : "s"} saved for later.`}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          body="Save products from their detail page to find them here later."
          actionLabel="Discover products"
          actionHref="/discover"
        />
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  );
}
