"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element is sufficiently visible in the viewport.
 * Used by the Discover feed to autoplay only the active card's video
 * and pause every other card once it scrolls off-screen.
 */
export function useInView<T extends HTMLElement>(threshold = 0.6) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= threshold),
      { threshold: [0, threshold, 1] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
