import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

/**
 * Explicit column list, never "*": profiles also carries Stripe Connect state
 * that the database's column-level grants hide from clients anyway.
 */
export const PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, bio, level, xp, coins, is_seller, created_at, updated_at";

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  xp: number;
  coins: number;
  is_seller: boolean;
  created_at: string;
  updated_at: string;
}

/** Maps a `public.profiles` row (snake_case, as Postgres returns it) to our camelCase Profile type. */
export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    level: row.level,
    xp: row.xp,
    coins: row.coins,
    isSeller: row.is_seller,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", ids);
  if (error) throw new Error(error.message);
  return (data as ProfileRow[]).map(mapProfileRow);
}

/** Usernames are unique but compared case-insensitively so /@Name and /@name resolve to the same person. */
export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .ilike("username", username.replace(/[\%_]/g, "\$&"))
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProfileRow(data as ProfileRow) : null;
}

/** Real seller-search for the header search box and /search page. */
export async function searchProfiles(query: string, limit = 5): Promise<Profile[]> {
  const q = query.trim().replace(/[\%_,()]/g, " ").trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .or(`username.ilike.*${q}*,display_name.ilike.*${q}*`)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as ProfileRow[]).map(mapProfileRow);
}
