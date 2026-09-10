import { TrendingUp, Sparkles, Star, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeTone = "trending" | "new" | "featured" | "neutral" | "success";

const toneClasses: Record<BadgeTone, string> = {
  trending: "bg-ink text-white",
  new: "bg-accent-500 text-white",
  featured: "bg-primary-600 text-white",
  neutral: "bg-surface-2 text-ink-soft",
  success: "bg-emerald-100 text-emerald-700",
};

const toneIcon: Partial<Record<BadgeTone, LucideIcon>> = {
  trending: TrendingUp,
  new: Sparkles,
  featured: Star,
};

const toneLabel: Partial<Record<BadgeTone, string>> = {
  trending: "Trending",
  new: "New",
  featured: "Featured",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = toneIcon[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        toneClasses[tone],
        className
      )}
    >
      {children ?? (
        <>
          {Icon && <Icon size={12} aria-hidden />}
          {toneLabel[tone] ?? tone}
        </>
      )}
    </span>
  );
}
