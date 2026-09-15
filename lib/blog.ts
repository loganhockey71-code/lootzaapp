import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  /** Category slugs (see lib/data/categories.ts) this post is most relevant to — used for internal linking, not a hard filter. */
  relatedCategories: string[];
}

export interface BlogPost extends BlogPostMeta {
  html: string;
}

function readSlugs(): string[] {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

function readPostMeta(slug: string): BlogPostMeta {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), "utf8");
  const { data } = matter(raw);
  return {
    slug,
    title: data.title,
    description: data.description,
    date: data.date,
    relatedCategories: data.relatedCategories ?? [],
  };
}

/** All posts, newest first — used by the /blog index. Doesn't parse markdown to HTML, since the index only needs frontmatter. */
export function getAllPosts(): BlogPostMeta[] {
  return readSlugs()
    .map(readPostMeta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const meta = readPostMeta(slug);
    const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), "utf8");
    const { content } = matter(raw);
    return { ...meta, html: marked.parse(content, { async: false }) as string };
  } catch {
    return null;
  }
}

export function getAllPostSlugs(): string[] {
  return readSlugs();
}
