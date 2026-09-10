"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search digital products...",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search size={16} className="pointer-events-none absolute left-3.5 text-ink-soft" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-border bg-bg pl-9 pr-4 text-sm text-ink placeholder:text-ink-soft/70 outline-none transition-colors focus:border-primary-400 focus:bg-surface focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}
