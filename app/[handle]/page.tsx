import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCreatorByHandle, creators } from "@/lib/data/creators";
import { getProductsByCreator } from "@/lib/data/products";
import { CreatorProfileClient } from "./CreatorProfileClient";

// Only bare handles are real routes — /@handle requests are rewritten to
// /handle by proxy.ts before the router ever sees the "@" (see proxy.ts).
export function generateStaticParams() {
  return creators.map((c) => ({ handle: c.handle }));
}

export async function generateMetadata(props: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const creator = getCreatorByHandle(handle);
  return { title: creator ? `${creator.name} (@${creator.handle}) — Lootza` : "Creator — Lootza" };
}

export default async function CreatorProfilePage(props: PageProps<"/[handle]">) {
  const { handle } = await props.params;
  const creator = getCreatorByHandle(handle);
  if (!creator) notFound();

  const products = getProductsByCreator(creator.id);

  return (
    <CreatorProfileClient creator={creator} products={products} isCurrentUser={creator.id === "pixelmax"} />
  );
}
