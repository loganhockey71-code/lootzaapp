import { notFound } from "next/navigation";
import { getCategory, categories } from "@/lib/data/categories";
import { CategoryContent } from "./CategoryContent";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage(props: PageProps<"/categories/[slug]">) {
  const { slug } = await props.params;
  const category = getCategory(slug);
  if (!category) notFound();

  return <CategoryContent slug={category.slug} />;
}
