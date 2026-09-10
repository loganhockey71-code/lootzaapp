import Link from "next/link";
import { Coins } from "lucide-react";
import { cn, formatCompactNumber } from "@/lib/utils";

export function CoinPill({ coins, className }: { coins: number; className?: string }) {
  return (
    <Link
      href="/wallet"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-sm font-bold text-accent-600 transition-colors hover:bg-accent-100",
        className
      )}
    >
      <Coins size={16} aria-hidden />
      {formatCompactNumber(coins)}
    </Link>
  );
}
