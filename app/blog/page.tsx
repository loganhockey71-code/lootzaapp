import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Lootza",
  description: "Guides on selling and buying digital products — templates, AI toolkits, marketplace tips, and platform comparisons.",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <BlogLayout>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Lootza Blog</h1>
      <p className="mt-2 text-ink-soft">Guides on buying and selling digital products.</p>

      <div className="mt-8 flex flex-col gap-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="text-xs font-medium text-ink-soft">{formatDate(post.date)}</span>
            <h2 className="font-display text-lg font-bold text-ink group-hover:text-primary-700">{post.title}</h2>
            <p className="text-sm text-ink-soft">{post.description}</p>
            <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary-600">
              Read more <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </BlogLayout>
  );
}
