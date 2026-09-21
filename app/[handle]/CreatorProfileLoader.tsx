"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { useAppState } from "@/lib/state/AppStateContext";
import { fetchProfileByUsername, fetchProfilesByIds } from "@/lib/supabase/profiles";
import { profileToCreator } from "@/lib/creators";
import type { Profile } from "@/lib/types";
import { CreatorProfileClient } from "./CreatorProfileClient";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Lookup = { key: string; profile: Profile | null };

/**
 * Resolves /@handle to a real `profiles` row and shows ONLY that account's own
 * products and posts. When the handle is the signed-in user's own, their live
 * profile from app state is used so avatar/name edits show up immediately.
 */
export function CreatorProfileLoader({ handle }: { handle: string }) {
  const { user, profile: myProfile, supabaseProducts, supabasePosts, productsLoading } = useAppState();
  const [lookup, setLookup] = useState<Lookup | null>(null);

  const isMine =
    !!myProfile && (myProfile.username.toLowerCase() === handle.toLowerCase() || myProfile.id === handle);

  useEffect(() => {
    if (isMine) return;
    let active = true;
    const request = UUID_RE.test(handle)
      ? fetchProfilesByIds([handle]).then((list) => list[0] ?? null)
      : fetchProfileByUsername(handle);
    request
      .then((found) => {
        if (active) setLookup({ key: handle, profile: found });
      })
      .catch((err: Error) => {
        console.error("Failed to load profile:", err.message);
        if (active) setLookup({ key: handle, profile: null });
      });
    return () => {
      active = false;
    };
  }, [handle, isMine]);

  const target = isMine ? myProfile : lookup?.key === handle ? lookup.profile : undefined;

  if (target === undefined || productsLoading) {
    return (
      <div className="pb-16">
        <div className="animate-shimmer h-40 w-full bg-surface-2 sm:h-56" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="animate-shimmer -mt-14 h-[104px] w-[104px] rounded-full border-4 border-bg bg-border sm:-mt-16" />
        </div>
      </div>
    );
  }
  if (target === null) notFound();

  const creator = profileToCreator(target);
  const products = supabaseProducts.filter((p) => p.sellerId === target.id);
  const posts = supabasePosts.filter((p) => p.creatorId === target.id);

  return (
    <CreatorProfileClient
      creator={creator}
      products={products}
      posts={posts}
      isCurrentUser={!!user && user.id === target.id}
    />
  );
}
