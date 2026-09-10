import { supabase } from "@/lib/supabase";
import { formatFileSize } from "@/lib/utils";
import type { CategorySlug, Product } from "@/lib/types";

/**
 * Real listings are always displayed under the same demo seller identity the
 * rest of Lootza already uses for "the current user" (see CURRENT_USER_ID in
 * AppStateContext) — the mock Creator/follow system this points at is out of
 * scope for this migration. The REAL owner is still `sellerId` (a genuine
 * Supabase auth id), which is what RLS and ownership checks actually use.
 */
const DISPLAY_CREATOR_ID = "pixelmax";

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
  created_at: string;
  updated_at: string;
}

/** "Just now" / "5m ago" / "3d ago", matching the style seed products already use. */
function toRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    description: row.description.split("\n").map((p) => p.trim()).filter(Boolean),
    category: row.category as CategorySlug,
    creatorId: DISPLAY_CREATOR_ID,
    sellerId: row.seller_id,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    // Engagement stats are owned by systems this migration doesn't touch (reviews/likes/sales) —
    // real listings start at zero exactly like locally-created ones already do.
    rating: 0,
    reviewCount: 0,
    sold: 0,
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

export interface NewProductInput {
  id: string;
  sellerId: string;
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
  const { data, error } = await supabase
    .from("products")
    .insert({
      id: input.id,
      seller_id: input.sellerId,
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
