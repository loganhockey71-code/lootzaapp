"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Thin wrapper around getUserMedia for the Sell > Video/Post camera flows.
 * Frontend-only: the stream never leaves the browser, and callers are
 * expected to always offer a file-upload fallback alongside this.
 */
export function useCamera(constraints: MediaStreamConstraints) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  // Not memoized: only ever called from a click handler, and constraints is
  // typically an inline object at the call site anyway (no stable identity to key off).
  async function start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera access isn't available in this browser — upload a file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setError(null);
      setActive(true);
    } catch {
      setError("Camera access wasn't granted — upload a file instead.");
    }
  }

  useEffect(() => stop, [stop]);

  return { videoRef, streamRef, active, error, start, stop };
}
