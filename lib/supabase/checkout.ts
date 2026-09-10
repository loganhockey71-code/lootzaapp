import { supabase } from "@/lib/supabase";

/**
 * Starts a real Stripe Checkout for a Supabase-backed product: asks the
 * server to create a session (which re-derives title/price from the product
 * row itself) then navigates the browser to the hosted Stripe payment page.
 * On success, Stripe redirects back to the product page with `?checkout=success`.
 */
export async function startCheckout(productId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { ok: false, error: "You must be logged in to buy this." };

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ productId }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: (json as { error?: string }).error ?? "Failed to start checkout." };
    window.location.href = (json as { url: string }).url;
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
