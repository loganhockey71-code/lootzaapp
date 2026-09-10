import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  size = "sm",
  showValue = true,
  className,
}: {
  rating: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}) {
  const starSize = size === "md" ? 18 : 14;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star size={starSize} className="fill-accent-500 text-accent-500" aria-hidden />
      {showValue && <span className="font-semibold text-ink">{rating.toFixed(1)}</span>}
    </span>
  );
}
