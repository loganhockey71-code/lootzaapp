import type { CategorySlug, Product } from "@/lib/types";
import { CATEGORY_ICONS } from "@/lib/icons";
import { hashSeed } from "@/lib/utils";

/**
 * Generates a premium, category-themed cover when `coverImage` is absent.
 * Once real seller uploads exist, set `product.coverImage` to that URL —
 * this component (and every place that renders it) needs no other change.
 */

const CATEGORY_PALETTE: Record<CategorySlug, [string, string, string]> = {
  gaming: ["#7c3aed", "#f5810a", "#1e1b4b"],
  graphics: ["#a855f7", "#ec4899", "#1c1033"],
  social: ["#f5810a", "#ec4899", "#2a1046"],
  web: ["#3b82f6", "#7c3aed", "#0b1226"],
  creator: ["#ec4899", "#a855f7", "#2a1046"],
  ai: ["#14b8a6", "#7c3aed", "#0b1226"],
};

export function ProductArtwork({
  product,
  className,
  priority,
}: {
  product: Pick<Product, "coverImage" | "coverSeed" | "category" | "title">;
  className?: string;
  priority?: boolean;
}) {
  if (product.coverImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external seller-uploaded assets, no static import list
      <img
        src={product.coverImage}
        alt={product.title}
        className={className}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }

  const seed = product.coverSeed;
  const h = hashSeed(seed);
  const [c1, c2, base] = CATEGORY_PALETTE[product.category];
  const Icon = CATEGORY_ICONS[product.category];
  const angle = 25 + (h % 110);

  const blob1 = {
    top: `${-20 + (h % 40)}%`,
    left: `${-10 + ((h >> 3) % 50)}%`,
    width: `${65 + (h % 25)}%`,
  };
  const blob2 = {
    bottom: `${-25 + ((h >> 5) % 35)}%`,
    right: `${-15 + ((h >> 7) % 45)}%`,
    width: `${55 + ((h >> 2) % 30)}%`,
  };
  const iconRotate = -18 + (h % 36);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        containerType: "inline-size",
        background: `linear-gradient(${angle}deg, ${base} 0%, ${base} 40%, #0a0714 100%)`,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          borderRadius: "9999px",
          filter: "blur(40px)",
          opacity: 0.65,
          background: c1,
          aspectRatio: "1 / 1",
          ...blob1,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          borderRadius: "9999px",
          filter: "blur(48px)",
          opacity: 0.55,
          background: c2,
          aspectRatio: "1 / 1",
          ...blob2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 28px)",
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontSize: "clamp(2.5rem, 18cqw, 7rem)",
          transform: `rotate(${iconRotate}deg)`,
          opacity: 0.22,
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))",
        }}
      >
        <Icon size="1em" strokeWidth={1.5} color="currentColor" />
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(0,0,0,0.18) 100%)",
        }}
      />
    </div>
  );
}
