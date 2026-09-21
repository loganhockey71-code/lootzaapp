import type { Metadata } from "next";
import { fetchProductBySlug } from "@/lib/supabase/products";
import { DynamicListingLookup } from "./DynamicListingLookup";

// Every listing is a real, seller-created Supabase row, so there is nothing to
// pre-render: the page resolves the product by slug once the client has loaded it.

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await fetchProductBySlug(slug);
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
  return <DynamicListingLookup slug={slug} />;
}
