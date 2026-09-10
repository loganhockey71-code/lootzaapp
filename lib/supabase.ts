import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!cachedClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Supports either key name depending on how the Supabase project's env vars were set up.
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local."
      );
    }
    cachedClient = createClient(supabaseUrl, supabaseKey);
  }
  return cachedClient;
}

/**
 * Lazily-created client Supabase instance, built on first actual use rather
 * than at module load. `next build` imports every module that's reachable
 * from a page (including this one, via AppStateContext in the root layout)
 * to collect its metadata — throwing here eagerly would fail the *entire*
 * build, including static pages that never touch Supabase, whenever these
 * env vars are missing. A Proxy keeps every call site (`supabase.from(...)`,
 * `supabase.auth.getSession()`, etc.) working exactly as before; only the
 * first property access can throw, and only once something actually tries
 * to use Supabase.
 *
 * Methods are rebound to the real client before being returned. Without
 * this, `supabase.from(...)` would call the real `from` function with
 * `this` bound to this Proxy (per normal JS method-call semantics), not to
 * the real client — breaking any internal `this.xyz` access inside
 * supabase-js. Binding here keeps `this` correct no matter how the method
 * is later invoked.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
