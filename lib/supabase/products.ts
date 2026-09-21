import { supabase } from "@/lib/supabase";
import { formatFileSize, toRelativeTime } from "@/lib/utils";
import type { CategorySlug, Product } from "@/lib/types";

export interface ProductRow {
  id: string;
  seller_id: string;
  title: string;
  tagline: string;
  description: string;
  slug: string;
  category: string;
  tags: string[];
  price: number;
  original_price: number | null;
  usage_rights: "Personal Use" | "Commercial Use";
  file_types: string[];
  compatible_with: string[];
  whats_included: string[];
  file_size_bytes: number | null;
  thumbnail_url: string | null;
  preview_images: string[];
  badge: "trending" | "new" | "featured" | null;
  limited_quantity_total: number | null;
  limited_quantity_remaining: number | null;
  release_at: string | null;
  status: "draft" | "active" | "archived";
  product_file_path: string | null;
  /** Real completed-purchase count — see 20260916_increment_product_sold.sql. */
  sold: number;
  created_at: string;
  updated_at: string;
}

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    description: row.description.split("\n").map((p) => p.trim()).filter(Boolean),
    category: row.category as CategorySlug,
    creatorId: row.seller_id,
    sellerId: row.seller_id,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    // Ratings/reviews/likes are still simulated client-side (unchanged) —
    // only `sold` is a real, database-backed count, incremented by
    // app/api/stripe/webhook after an actual completed payment.
    rating: 0,
    reviewCount: 0,
    sold: row.sold,
    likes: 0,
    coverImage: row.thumbnail_url,
    videoUrl: null,
    coverSeed: row.slug,
    gallerySeeds: row.preview_images.length > 0 ? row.preview_images : [row.slug],
    badge: row.badge ?? undefined,
    postedAt: toRelativeTime(row.created_at),
    fileSize: row.file_size_bytes != null ? formatFileSize(row.file_size_bytes) : "—",
    fileTypes: row.file_types,
    compatibleWith: row.compatible_with,
    lastUpdated: toRelativeTime(row.updated_at),
    whatsIncluded: row.whats_included,
    usageRights: row.usage_rights,
    reviews: [],
    limitedQuantity:
      row.limited_quantity_total != null
        ? { total: row.limited_quantity_total, remaining: row.limited_quantity_remaining ?? row.limited_quantity_total }
        : undefined,
    releaseAt: row.release_at,
    productFilePath: row.product_file_path,
  };
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ProductRow[]).map(mapProductRow);
}

/**
 * Looks up a single real listing by slug — used by generateMetadata (a Server
 * Component context) for a product that isn't in the static seed catalog, so
 * real sellers' listings get real SEO metadata instead of the generic
 * fallback. Returns null on any miss/error rather than throwing, since a
 * failed metadata lookup should degrade to the fallback title, not break the
 * page.
 */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
  if (error || !data) return null;
  return mapProductRow(data as ProductRow);
}

export interface NewProductInput {
  id: string;
  title: string;
  tagline: string;
  description: string[];
  slug: string;
  category: CategorySlug;
  price: number;
  originalPrice?: number;
  usageRights: "Personal Use" | "Commercial Use";
  fileTypes: string[];
  compatibleWith: string[];
  whatsIncluded: string[];
  fileSizeBytes?: number;
  thumbnailUrl?: string | null;
  productFilePath?: string | null;
  badge?: "trending" | "new" | "featured";
  limitedQuantityTotal?: number;
  releaseAt?: string | null;
}

export async function insertProduct(input: NewProductInput): Promise<Product> {
  // The owner is always the verified, currently signed-in user — never a value
  // passed in by the caller. RLS additionally rejects any row whose seller_id
  // isn't auth.uid(), so a forged owner can't get through either way.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("You must be logged in to create a listing.");

  const { data, error } = await supabase
    .from("products")
    .insert({
      id: input.id,
      seller_id: authData.user.id,
      title: input.title,
      tagline: input.tagline,
      description: input.description.join("\n"),
      slug: input.slug,
      category: input.category,
      price: input.price,
      original_price: input.originalPrice ?? null,
      usage_rights: input.usageRights,
      file_types: input.fileTypes,
      compatible_with: input.compatibleWith,
      whats_included: input.whatsIncluded,
      file_size_bytes: input.fileSizeBytes ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      product_file_path: input.productFilePath ?? null,
      badge: input.badge ?? null,
      limited_quantity_total: input.limitedQuantityTotal ?? null,
      limited_quantity_remaining: input.limitedQuantityTotal ?? null,
      release_at: input.releaseAt ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapProductRow(data as ProductRow);
}
