import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!cachedClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Missing Supabase service-role environment variables. Set SUPABASE_SERVICE_ROLE_KEY in .env.local " +
          "(server-only — never prefix it with NEXT_PUBLIC_, or it would be bundled into client code)."
      );
    }
    cachedClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cachedClient;
}

/**
 * Service-role client — bypasses Row Level Security entirely. The `server-only`
 * import above makes any accidental import of this file from client code a
 * build error. ONLY import this from Route Handlers / other server-only code,
 * and ONLY after that code has independently verified who the caller is
 * (see app/api/download/route.ts) — this client trusts nothing on its own.
 *
 * Built lazily (via Proxy) on first actual use rather than at module load,
 * same reasoning as lib/supabase.ts: a missing env var should fail the one
 * request that needed it (as a normal 500 from the route handler), not the
 * whole `next build`. Every call site keeps working unchanged.
 *
 * Methods are rebound to the real client before being returned — see the
 * matching comment in lib/supabase.ts for why that's necessary with a Proxy.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
