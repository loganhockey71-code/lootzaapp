import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCategory, categories } from "@/lib/data/categories";
import { getProductsByCategory } from "@/lib/data/products";
import { CATEGORY_ICONS } from "@/lib/icons";
import { CategoryContent } from "./CategoryContent";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage(props: PageProps<"/categories/[slug]">) {
  const { slug } = await props.params;
  const category = getCategory(slug);
  if (!category) notFound();

  const items = getProductsByCategory(category.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        icon={CATEGORY_ICONS[category.slug]}
        title={category.name}
        subtitle={`${category.description} · ${items.length} products`}
      />
      <CategoryContent products={items} />
    </div>
  );
}
