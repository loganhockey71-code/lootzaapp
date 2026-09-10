import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";

export function ProductGrid({
  products,
  emptyTitle = "Nothing here yet",
  emptyBody = "Check back soon.",
}: {
  products: Product[];
  emptyTitle?: string;
  emptyBody?: string;
}) {
  if (products.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < 4} />
      ))}
    </div>
  );
}
