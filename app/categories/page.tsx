import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { categories } from "@/lib/data/categories";
import { products } from "@/lib/data/products";
import { CATEGORY_ICONS } from "@/lib/icons";

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Categories" subtitle="Browse every corner of the marketplace." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const count = products.filter((p) => p.category === cat.slug).length;
          const Icon = CATEGORY_ICONS[cat.slug];
          return (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="group flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: `${cat.accent}1a`, color: cat.accent }}
              >
                <Icon size={26} aria-hidden />
              </span>
              <div>
                <h2 className="font-display text-lg font-extrabold text-ink">{cat.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">{cat.description}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600">
                {count} products <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
