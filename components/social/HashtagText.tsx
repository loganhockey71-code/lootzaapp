"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const HASHTAG_SPLIT_RE = /(#[a-zA-Z0-9_]+)/g;

/** Renders text with `#hashtags` as clickable links into search, everything else as plain text. */
export function HashtagText({ text, className, linkClassName }: { text: string; className?: string; linkClassName?: string }) {
  const parts = text.split(HASHTAG_SPLIT_RE);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <Link
            key={i}
            href={`/search?q=${encodeURIComponent(part.toLowerCase())}`}
            onClick={(e) => e.stopPropagation()}
            className={cn("font-semibold underline-offset-2 hover:underline", linkClassName)}
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
