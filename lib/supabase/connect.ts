import { supabase } from "@/lib/supabase";

async function authHeader(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

export interface PayoutStatus {
  connected: boolean;
  payoutsEnabled: boolean;
}

/** Reads the caller's own Stripe Connect payout status. */
export async function fetchPayoutStatus(): Promise<PayoutStatus | null> {
  const headers = await authHeader();
  if (!headers) return null;
  const res = await fetch("/api/stripe/connect", { headers });
  if (!res.ok) return null;
  return (await res.json()) as PayoutStatus;
}

/** Starts (or resumes) Stripe Connect onboarding and navigates there. */
export async function startPayoutOnboarding(): Promise<{ ok: true } | { ok: false; error: string }> {
  const headers = await authHeader();
  if (!headers) return { ok: false, error: "You must be logged in." };

  let res: Response;
  try {
    res = await fetch("/api/stripe/connect", { method: "POST", headers });
  } catch {
    return { ok: false, error: "Network error. Please check your connection and try again." };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    // The route always returns JSON, even on failure — a response that
    // isn't JSON means something outside our own code (a platform-level
    // timeout/502, for example), so say that rather than the more specific
    // wording used for the errors that route can return.
    return { ok: false, error: `Unexpected server response (status ${res.status}). Please try again.` };
  }

  if (!res.ok) return { ok: false, error: (json as { error?: string }).error ?? "Failed to start payout setup." };
  window.location.href = (json as { url: string }).url;
  return { ok: true };
}
