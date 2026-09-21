"use client";

import { useAppState } from "@/lib/state/AppStateContext";
import type { Product } from "@/lib/types";

/**
 * The full current marketplace: every real (Supabase-backed) listing, used to
 * compute rarity, search, feeds, etc. There is no demo/seed catalog any more.
 */
export function useAllProducts(): Product[] {
  return useAppState().supabaseProducts;
}
