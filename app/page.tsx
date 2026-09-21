import Link from "next/link";
import { ArrowRight, Sparkles, Compass, ShoppingBag, Trophy, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TrendingProducts } from "@/components/product/TrendingProducts";

const howItWorks: { step: string; title: string; body: string; icon: LucideIcon }[] = [
  { step: "1", title: "Discover", body: "Browse or scroll the feed to find ebooks, music, templates, art, courses, and more.", icon: Compass },
  { step: "2", title: "Buy & download", body: "Pay securely and get instant access to your files.", icon: ShoppingBag },
  { step: "3", title: "Collect & sell", body: "Build your collection, then drop your own products when you're ready.", icon: Trophy },
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
            Discover, buy, and collect the best digital products, from ebooks and music to templates, art, and software, and AI
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

          <div className="mt-14 grid w-full max-w-3xl grid-cols-1 gap-4 rounded-2xl border border-border bg-surface/80 p-5 shadow-card backdrop-blur sm:grid-cols-3 sm:p-6">
            {howItWorks.map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-1.5 text-center sm:items-start sm:text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <s.icon size={18} aria-hidden />
                </span>
                <span className="font-display text-sm font-extrabold text-ink">
                  {s.step}. {s.title}
                </span>
                <span className="text-xs text-ink-soft">{s.body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TrendingProducts />

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
