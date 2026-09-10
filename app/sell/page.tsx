import Link from "next/link";
import { Package, Video, Image as ImageIcon, ArrowRight, type LucideIcon } from "lucide-react";

const OPTIONS: {
  id: string;
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    id: "product",
    href: "/sell/product",
    icon: Package,
    title: "Product",
    description: "List a digital product buyers can purchase and download.",
  },
  {
    id: "video",
    href: "/sell/video",
    icon: Video,
    title: "Video",
    description: "Record or upload a short video connected to one of your products.",
  },
  {
    id: "post",
    href: "/sell/post",
    icon: ImageIcon,
    title: "Post",
    description: "Share a photo update with a caption, optionally linked to a product.",
  },
];

export default function SellChooserPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
          What are you making today?
        </h1>
        <p className="mt-2 text-ink-soft">Pick what you&apos;d like to create. You can always make more later.</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {OPTIONS.map((opt) => (
          <Link
            key={opt.id}
            href={opt.href}
            className="group flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface p-6 text-center shadow-card transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-card-hover"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink-soft transition-all group-hover:scale-110 group-hover:bg-primary-50 group-hover:text-primary-600">
              <opt.icon size={26} aria-hidden />
            </span>
            <h2 className="font-display text-lg font-extrabold text-ink">{opt.title}</h2>
            <p className="text-sm text-ink-soft">{opt.description}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">
              Get started <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
