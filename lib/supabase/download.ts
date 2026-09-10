import { supabase } from "@/lib/supabase";

/** Calls the secure /api/download endpoint, passing the caller's own Supabase access token. */
export async function requestDownloadUrl(
  productId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { ok: false, error: "You must be logged in to download this." };

  try {
    const res = await fetch(`/api/download?productId=${encodeURIComponent(productId)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: (json as { error?: string }).error ?? "Download failed." };
    return { ok: true, url: (json as { url: string }).url };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
