import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 shrink-0", className)}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="lootza-lid" x1="4" y1="8" x2="26" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6d5bff" />
            <stop offset="1" stopColor="#4c2fe0" />
          </linearGradient>
          <linearGradient id="lootza-box" x1="6" y1="15" x2="26" y2="29" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7c3aed" />
            <stop offset="1" stopColor="#5b21b6" />
          </linearGradient>
        </defs>
        <path d="M5 12.5 15 7.5a2 2 0 0 1 1.8 0L26 12" stroke="url(#lootza-lid)" strokeWidth="5" strokeLinecap="round" />
        <path
          d="M6 14.5v9a2 2 0 0 0 1.06 1.76l7.5 4.2a2 2 0 0 0 1.9.02l7.98-4.22A2 2 0 0 0 25.5 23.5v-9L16 20 6 14.5Z"
          fill="url(#lootza-box)"
        />
        <path d="m20.5 8.5.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9.9-2Z" fill="#fbbf24" />
        <path d="m14 12 .6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" fill="#7c3aed" />
      </svg>
      {!iconOnly && (
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">Lootza</span>
      )}
    </Link>
  );
}
