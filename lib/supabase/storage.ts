import { supabase } from "@/lib/supabase";

export const PRODUCT_PREVIEWS_BUCKET = "product-previews";
export const PRODUCT_FILES_BUCKET = "product-files";

// Matches the buckets' configured file_size_limit in the storage migration.
export const MAX_PREVIEW_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
// Supabase's default free-tier per-file upload limit — see the report before raising this.
export const MAX_PRODUCT_FILE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Strips directory components and anything but safe characters, so a name
 * like "../../etc/passwd" or "cool file (final) v2!.zip" becomes a single
 * flat, storage-safe segment. Never trust a File's reported name as a path.
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return cleaned.slice(0, 120) || "file";
}

/** "<seller_id>/<product_id>/<sanitized filename>" — the ownership boundary storage policies check against. */
export function buildStoragePath(sellerId: string, productId: string, filename: string): string {
  return `${sellerId}/${productId}/${sanitizeFilename(filename)}`;
}

export function validatePreviewImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Cover image must be an image file.";
  if (file.size > MAX_PREVIEW_IMAGE_BYTES) {
    return `Cover image must be under ${Math.round(MAX_PREVIEW_IMAGE_BYTES / (1024 * 1024))}MB.`;
  }
  return null;
}

export function validateProductFile(file: File): string | null {
  if (file.size > MAX_PRODUCT_FILE_BYTES) {
    return `Product file must be under ${Math.round(MAX_PRODUCT_FILE_BYTES / (1024 * 1024))}MB.`;
  }
  return null;
}

export async function uploadPreviewImage(
  sellerId: string,
  productId: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const path = buildStoragePath(sellerId, productId, file.name);
  const { error } = await supabase.storage
    .from(PRODUCT_PREVIEWS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(PRODUCT_PREVIEWS_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Uploads to the PRIVATE bucket and returns only the storage path — never a public URL. */
export async function uploadProductFile(sellerId: string, productId: string, file: File): Promise<{ path: string }> {
  const path = buildStoragePath(sellerId, productId, file.name);
  const { error } = await supabase.storage
    .from(PRODUCT_FILES_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  if (error) throw new Error(error.message);
  return { path };
}

/** Best-effort cleanup after a failed upload/insert — never throws, so it can't mask the original error. */
export async function removeUploadedFiles(previewPath: string | null, productFilePath: string | null): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  if (previewPath) jobs.push(supabase.storage.from(PRODUCT_PREVIEWS_BUCKET).remove([previewPath]));
  if (productFilePath) jobs.push(supabase.storage.from(PRODUCT_FILES_BUCKET).remove([productFilePath]));
  await Promise.allSettled(jobs);
}
