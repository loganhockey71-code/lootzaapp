import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";
import { getCategory } from "@/lib/data/categories";

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Blog — Lootza" };
  const title = `${post.title} — Lootza`;
  return {
    title,
    description: post.description,
    openGraph: { title, description: post.description, type: "article" },
    twitter: { card: "summary", title, description: post.description },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedCategories = post.relatedCategories.map(getCategory).filter((c) => c != null);

  return (
    <BlogLayout>
      <Link href="/blog" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
        &larr; All posts
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{post.title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{formatDate(post.date)}</p>

      <div
        className="mt-8 flex flex-col gap-4 text-[15px] leading-relaxed text-ink-soft [&_a]:font-semibold [&_a]:text-primary-600 [&_a:hover]:text-primary-700 [&_h2]:mt-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-5 [&_ul]:[list-style-type:disc]"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      {relatedCategories.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <span className="text-sm font-semibold text-ink">Related categories:</span>
          {relatedCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="rounded-full border border-border bg-surface px-3 py-1 text-sm font-semibold text-ink-soft hover:border-primary-300 hover:text-ink"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </BlogLayout>
  );
}
