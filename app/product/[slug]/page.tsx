import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts, products } from "@/lib/data/products";
import { getCreatorById } from "@/lib/data/creators";
import { ProductDetailClient } from "./ProductDetailClient";
import { DynamicListingLookup } from "./DynamicListingLookup";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = getProductBySlug(slug);
  return { title: product ? `${product.title} — Lootza` : "Product — Lootza" };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const product = getProductBySlug(slug);

  if (!product) {
    return <DynamicListingLookup slug={slug} />;
  }

  const creator = getCreatorById(product.creatorId)!;
  const related = getRelatedProducts(product);

  return <ProductDetailClient product={product} creator={creator} related={related} />;
}
