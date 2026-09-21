import type { Metadata } from "next";
import { fetchProfileByUsername } from "@/lib/supabase/profiles";
import { CreatorProfileLoader } from "./CreatorProfileLoader";

// Only bare handles are real routes — /@handle requests are rewritten to
// /handle by proxy.ts before the router ever sees the "@" (see proxy.ts).
// Profiles are real, user-created rows, so there is nothing to pre-render.

export async function generateMetadata(props: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  try {
    const profile = await fetchProfileByUsername(decodeURIComponent(handle));
    if (profile) {
      const name = profile.displayName?.trim() || profile.username;
      return { title: `${name} (@${profile.username}) — Lootza` };
    }
  } catch {
    // A failed lookup should degrade to the generic title, not break the page.
  }
  return { title: "Creator — Lootza" };
}

export default async function CreatorProfilePage(props: PageProps<"/[handle]">) {
  const { handle } = await props.params;
  return <CreatorProfileLoader handle={decodeURIComponent(handle)} />;
}
