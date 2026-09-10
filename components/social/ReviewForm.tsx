"use client";

import { useState } from "react";
import { Star, ShieldCheck } from "lucide-react";
import { useAppState } from "@/lib/state/AppStateContext";
import { Button } from "@/components/ui/Button";

export function ReviewForm({ productId }: { productId: string }) {
  const { addReview, isOwned } = useAppState();
  const owned = isOwned(productId);
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!owned) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-ink-soft">
        Buy this product to leave a Verified Purchase review.
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        <ShieldCheck size={16} aria-hidden /> Thanks. Your review is live.
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    addReview(productId, rating, body);
    setSubmitted(true);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-ink">Your rating</span>
        <div className="flex" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
            >
              <Star
                size={20}
                className={n <= (hovered || rating) ? "fill-accent-500 text-accent-500" : "text-border"}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="What did you think?"
        className="input resize-none"
      />
      <Button type="submit" size="sm" className="w-fit gap-1.5" disabled={!body.trim()}>
        <ShieldCheck size={14} aria-hidden /> Post Verified Review
      </Button>
    </form>
  );
}
