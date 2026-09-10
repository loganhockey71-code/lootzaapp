import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp, Star, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import { products } from "@/lib/data/products";

const trending = products.filter((p) => p.badge === "trending").slice(0, 5);
const stats: { label: string; value: string; icon: LucideIcon }[] = [
  { label: "Drops today", value: "2,458", icon: TrendingUp },
  { label: "Buyer rating", value: "98.6%", icon: Star },
  { label: "Happy users", value: "125K+", icon: Users },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-bg">
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center sm:py-28">
          <span className="animate-float-slow mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-surface/80 px-4 py-1.5 text-sm font-semibold text-primary-700 shadow-sm">
            <Sparkles size={16} aria-hidden /> The gamified marketplace for digital creators
          </span>
          <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-6xl">
            Create. <span className="text-primary-600">Drop.</span> Collect.
          </h1>
          <p className="mt-5 max-w-xl text-base text-ink-soft sm:text-lg">
            Discover, buy, and collect the best game assets, UI kits, social packs, and AI
            resources, from creators leveling up right alongside you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/discover">
              <Button size="lg" className="gap-1.5">
                Start Discovering <ArrowRight size={18} aria-hidden />
              </Button>
            </Link>
            <Link href="/sell">
              <Button size="lg" variant="outline">
                Start Selling
              </Button>
            </Link>
          </div>

          <div className="mt-14 grid w-full max-w-2xl grid-cols-3 gap-4 rounded-2xl border border-border bg-surface/80 p-5 shadow-card backdrop-blur">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <s.icon size={20} className="text-ink-soft" aria-hidden />
                <span className="font-display text-lg font-extrabold text-ink sm:text-xl">{s.value}</span>
                <span className="text-xs text-ink-soft">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-ink sm:text-2xl">
            <TrendingUp size={22} className="text-primary-600" aria-hidden /> Trending right now
          </h2>
          <Link
            href="/discover"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            View all <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {trending.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-primary-700 px-8 py-12 text-center text-white sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="font-display text-2xl font-extrabold">Climb the ranks. Earn rewards.</h2>
            <p className="mt-1 text-primary-100">Level up your seller profile, earn XP, and unlock badges.</p>
          </div>
          <Link href="/sell">
            <Button size="lg" className="!bg-white !text-primary-700 hover:!bg-primary-50">
              Drop your first product
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
