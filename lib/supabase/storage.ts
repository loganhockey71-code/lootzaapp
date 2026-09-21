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

// ---------------------------------------------------------------------------
// Avatars + post media. Both buckets are public-read and only writable inside
// the caller's own "<user id>/" folder (see 20260922_ownership_posts_avatars.sql).
// ---------------------------------------------------------------------------

export const AVATARS_BUCKET = "avatars";
export const POST_MEDIA_BUCKET = "post-media";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB — matches the bucket's file_size_limit
export const MAX_POST_MEDIA_BYTES = 50 * 1024 * 1024; // 50MB — matches the bucket's file_size_limit

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function validateAvatar(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "Profile picture must be a JPG, PNG, WebP or GIF image.";
  if (file.size > MAX_AVATAR_BYTES) return `Profile picture must be under ${MAX_AVATAR_BYTES / (1024 * 1024)}MB.`;
  return null;
}

export function validatePostMedia(file: Blob, kind: "image" | "video"): string | null {
  if (!file.type.startsWith(`${kind}/`)) return `That file isn't a ${kind}.`;
  if (file.size > MAX_POST_MEDIA_BYTES) return `Files must be under ${MAX_POST_MEDIA_BYTES / (1024 * 1024)}MB.`;
  return null;
}

function extensionFor(type: string): string {
  const subtype = type.split("/")[1]?.split(";")[0] ?? "bin";
  return subtype === "jpeg" ? "jpg" : subtype === "quicktime" ? "mov" : subtype.replace(/[^a-z0-9]/gi, "") || "bin";
}

/**
 * Uploads a new avatar to "<userId>/avatar-<timestamp>.<ext>" and returns its public URL.
 * A fresh filename per upload (instead of overwriting one fixed path) sidesteps CDN/browser
 * caching of the old image. Older avatars in the folder are removed on a best-effort basis.
 */
export async function uploadAvatar(userId: string, file: File): Promise<{ path: string; publicUrl: string }> {
  const path = `${userId}/avatar-${Date.now()}.${extensionFor(file.type)}`;
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Best-effort removal of every avatar in the user's folder except `keepPath`. Never throws. */
export async function pruneOldAvatars(userId: string, keepPath: string): Promise<void> {
  try {
    const { data } = await supabase.storage.from(AVATARS_BUCKET).list(userId);
    const stale = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keepPath);
    if (stale.length > 0) await supabase.storage.from(AVATARS_BUCKET).remove(stale);
  } catch {
    // Leftover files are harmless; never let cleanup mask a successful upload.
  }
}

export async function removeAvatarFile(path: string): Promise<void> {
  await Promise.allSettled([supabase.storage.from(AVATARS_BUCKET).remove([path])]);
}

/** Uploads a post's photo/video to "<userId>/<postId>.<ext>" and returns its public URL. */
export async function uploadPostMedia(
  userId: string,
  postId: string,
  file: Blob
): Promise<{ path: string; publicUrl: string }> {
  const path = `${userId}/${postId}.${extensionFor(file.type)}`;
  const { error } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function removePostMedia(path: string): Promise<void> {
  await Promise.allSettled([supabase.storage.from(POST_MEDIA_BUCKET).remove([path])]);
}
