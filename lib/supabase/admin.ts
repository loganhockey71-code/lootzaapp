import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing Supabase service-role environment variables. Set SUPABASE_SERVICE_ROLE_KEY in .env.local " +
      "(server-only — never prefix it with NEXT_PUBLIC_, or it would be bundled into client code)."
  );
}

/**
 * Service-role client — bypasses Row Level Security entirely. The `server-only`
 * import above makes any accidental import of this file from client code a
 * build error. ONLY import this from Route Handlers / other server-only code,
 * and ONLY after that code has independently verified who the caller is
 * (see app/api/download/route.ts) — this client trusts nothing on its own.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
