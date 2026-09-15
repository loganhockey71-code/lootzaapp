import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts, products } from "@/lib/data/products";
import { fetchProductBySlug } from "@/lib/supabase/products";
import { getCreatorById } from "@/lib/data/creators";
import { ProductDetailClient } from "./ProductDetailClient";
import { DynamicListingLookup } from "./DynamicListingLookup";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  // Real (Supabase-backed) listings aren't in the static seed catalog, so a
  // miss here falls through to a live lookup — otherwise every real seller's
  // product would get the generic fallback title/description and be
  // invisible to search engines, which defeats the point of a public product page.
  const product = getProductBySlug(slug) ?? (await fetchProductBySlug(slug));
  if (!product) return { title: "Product — Lootza" };

  const title = `${product.title} — Lootza`;
  const description = product.tagline;
  const images = product.coverImage ? [{ url: product.coverImage }] : undefined;

  return {
    title,
    description,
    openGraph: { title, description, images, type: "website" },
    twitter: { card: "summary_large_image", title, description, images: product.coverImage ? [product.coverImage] : undefined },
  };
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
