import { supabase } from "@/lib/supabase";
import { toRelativeTime } from "@/lib/utils";
import type { CategorySlug, FeedPost, FeedPostType } from "@/lib/types";

export interface PostRow {
  id: string;
  author_id: string;
  type: FeedPostType;
  media_url: string;
  category: string | null;
  caption: string;
  linked_product_id: string | null;
  collaborator_id: string | null;
  created_at: string;
}

export function mapPostRow(row: PostRow): FeedPost {
  return {
    id: row.id,
    type: row.type,
    creatorId: row.author_id,
    mediaUrl: row.media_url,
    coverSeed: row.id,
    category: (row.category as CategorySlug | null) ?? null,
    caption: row.caption,
    linkedProductId: row.linked_product_id,
    // Likes are still tracked client-side only; a fresh post genuinely has none.
    likes: 0,
    postedAt: toRelativeTime(row.created_at),
    collaboratorId: row.collaborator_id,
  };
}

export async function fetchPosts(): Promise<FeedPost[]> {
  const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as PostRow[]).map(mapPostRow);
}

export interface NewPostInput {
  id: string;
  type: FeedPostType;
  mediaUrl: string;
  category: CategorySlug | null;
  caption: string;
  linkedProductId: string | null;
  collaboratorId: string | null;
}

export async function insertPost(input: NewPostInput): Promise<FeedPost> {
  // Owner is always the verified signed-in user; RLS rejects anything else.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("You must be logged in to post.");

  const { data, error } = await supabase
    .from("posts")
    .insert({
      id: input.id,
      author_id: authData.user.id,
      type: input.type,
      media_url: input.mediaUrl,
      category: input.category,
      caption: input.caption,
      linked_product_id: input.linkedProductId,
      collaborator_id: input.collaboratorId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapPostRow(data as PostRow);
}
