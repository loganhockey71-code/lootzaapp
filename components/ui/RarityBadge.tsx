import { Sparkles } from "lucide-react";
import type { Rarity } from "@/lib/types";
import { cn } from "@/lib/utils";

const config: Record<Rarity, { label: string; classes: string } | null> = {
  common: null,
  uncommon: { label: "Uncommon", classes: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200" },
  rare: { label: "Rare", classes: "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200" },
  epic: { label: "Epic", classes: "bg-purple-50 text-purple-600 ring-1 ring-inset ring-purple-200" },
  legendary: {
    label: "Legendary",
    classes: "bg-legendary text-white",
  },
};

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  const cfg = config[rarity];
  if (!cfg) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        cfg.classes,
        className
      )}
    >
      {rarity === "legendary" && <Sparkles size={12} aria-hidden />}
      {cfg.label}
    </span>
  );
}
