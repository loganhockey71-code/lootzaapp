"use client";

import { Ban, Package } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductArtwork } from "@/components/product/ProductArtwork";
import { cn } from "@/lib/utils";

export function ProductPicker({
  products,
  value,
  onChange,
  allowNone,
}: {
  products: Product[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowNone?: boolean;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2/40 px-4 py-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink-soft">
          <Package size={18} aria-hidden />
        </span>
        <p className="text-sm text-ink-soft">
          You don&apos;t have any products yet. Drop a product first to connect this to it.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "flex aspect-video flex-col items-center justify-center gap-1.5 rounded-xl border-2 text-xs font-semibold transition-colors",
            value === null
              ? "border-primary-600 bg-primary-50 text-primary-700"
              : "border-dashed border-border text-ink-soft hover:border-primary-300"
          )}
        >
          <Ban size={18} aria-hidden />
          None
        </button>
      )}
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onChange(product.id)}
          className={cn(
            "relative overflow-hidden rounded-xl border-2 text-left transition-colors",
            value === product.id ? "border-primary-600" : "border-transparent"
          )}
        >
          <ProductArtwork product={product} className="aspect-video w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-[11px] font-semibold text-white">
            {product.title}
          </span>
        </button>
      ))}
    </div>
  );
}
