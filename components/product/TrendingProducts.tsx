"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { useAllProducts } from "@/lib/hooks/useAllProducts";

/** Best-selling real listings. Renders nothing until there is at least one product to show. */
export function TrendingProducts() {
  const products = useAllProducts();
  const trending = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);
  if (trending.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-ink sm:text-2xl">
          <TrendingUp size={22} className="text-primary-600" aria-hidden /> Trending right now
        </h2>
        <Link
          href="/discover"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          View all <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {trending.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
