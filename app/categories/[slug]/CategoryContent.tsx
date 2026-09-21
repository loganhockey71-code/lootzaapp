"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { SearchInput } from "@/components/ui/SearchInput";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { getCategory } from "@/lib/data/categories";
import { CATEGORY_ICONS } from "@/lib/icons";
import type { CategorySlug } from "@/lib/types";
import { postedAtToMinutes } from "@/lib/utils";

const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "newest", label: "Newest" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
];

export function CategoryContent({ slug }: { slug: CategorySlug }) {
  const allProducts = useAllProducts();
  const category = getCategory(slug)!;
  const products = useMemo(() => allProducts.filter((p) => p.category === slug), [allProducts, slug]);
  const [sort, setSort] = useState("popular");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    let result = [...products];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q));
    }
    switch (sort) {
      case "newest":
        result.sort((a, b) => postedAtToMinutes(a.postedAt) - postedAtToMinutes(b.postedAt));
        break;
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      default:
        result.sort((a, b) => b.sold - a.sold);
    }
    return result;
  }, [products, sort, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        icon={CATEGORY_ICONS[category.slug]}
        title={category.name}
        subtitle={`${category.description} · ${products.length} product${products.length === 1 ? "" : "s"}`}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs tabs={SORTS} activeId={sort} onChange={setSort} />
        <SearchInput value={query} onChange={setQuery} className="sm:w-64" placeholder="Search this category..." />
      </div>
      <ProductGrid
        products={list}
        emptyTitle={products.length === 0 ? "Nothing here yet" : "No products match"}
        emptyBody={products.length === 0 ? "No one has listed a product in this category yet." : "Try clearing your search."}
      />
    </div>
  );
}
