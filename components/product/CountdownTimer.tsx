"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

function getRemaining(endsAt: string) {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    ended: diff <= 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CountdownTimer({
  endsAt,
  className,
  suffix = "left",
  endedLabel = "Drop ended",
}: {
  endsAt: string;
  className?: string;
  /** Text shown after the digits while still counting down, e.g. "left" or "until release". */
  suffix?: string;
  /** Text shown once the countdown reaches zero. */
  endedLabel?: string;
}) {
  const [remaining, setRemaining] = useState(() => getRemaining(endsAt));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (remaining.ended) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold", className)}>
        <Timer size={13} aria-hidden /> {endedLabel}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold tabular-nums", className)}>
      <Timer size={13} aria-hidden />
      {remaining.days > 0 && `${remaining.days}d `}
      {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)} {suffix}
    </span>
  );
}
