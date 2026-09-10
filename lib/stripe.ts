import "server-only";
import Stripe from "stripe";

let cachedClient: Stripe | null = null;

/**
 * Server-only Stripe client, built lazily on first use. ONLY call this from
 * Route Handlers / other server-only code — the `server-only` import above
 * makes an accidental client-side import a build error.
 *
 * Lazy on purpose: `next build` loads every route module to collect its
 * metadata, so throwing for a missing key at module load (rather than at
 * first actual use) would fail the build itself whenever STRIPE_SECRET_KEY
 * isn't set in the build environment.
 */
export function getStripe(): Stripe {
  if (!cachedClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        "Missing STRIPE_SECRET_KEY environment variable. Set it in .env.local " +
          "(server-only — never prefix it with NEXT_PUBLIC_, or it would be bundled into client code)."
      );
    }
    cachedClient = new Stripe(secretKey);
  }
  return cachedClient;
}
