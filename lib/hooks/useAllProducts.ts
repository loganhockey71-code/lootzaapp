"use client";

import { useMemo } from "react";
import { products } from "@/lib/data/products";
import { useAppState } from "@/lib/state/AppStateContext";
import type { Product } from "@/lib/types";

/**
 * The full current marketplace snapshot: the seed catalog, real Supabase listings,
 * and anything dropped this session locally — used to compute rarity, search, etc.
 * Deduped by id, with Supabase's copy winning over a stale local one for a listing
 * that was just created (both are pushed with the same id — see the sell form).
 */
export function useAllProducts() {
  const { myListings, supabaseProducts } = useAppState();
  return useMemo(() => {
    const byId = new Map<string, Product>();
    for (const p of products) byId.set(p.id, p);
    for (const p of myListings) byId.set(p.id, p);
    for (const p of supabaseProducts) byId.set(p.id, p);
    return [...byId.values()];
  }, [myListings, supabaseProducts]);
}
