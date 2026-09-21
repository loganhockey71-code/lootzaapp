"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { useAppState } from "@/lib/state/AppStateContext";
import { cn } from "@/lib/utils";

/**
 * The signed-in user's own avatar with a change/remove control. Uploads go to
 * Supabase Storage (avatars/<user id>/...) and the resulting URL is saved on
 * their `profiles` row, so it follows them across devices and shows up
 * everywhere their avatar appears. Only ever edits the CURRENT user's profile.
 */
export function AvatarUploader({
  size = 72,
  className,
  avatarClassName,
  showRemove = true,
}: {
  size?: number;
  className?: string;
  avatarClassName?: string;
  showRemove?: boolean;
}) {
  const { user, profile, uploadProfileAvatar, removeProfileAvatar } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = profile?.displayName?.trim() || profile?.username || user?.username || "You";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await uploadProfileAvatar(file);
    setBusy(false);
    if (!result.ok) setError(result.error);
    // Allow re-selecting the same file after an error.
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    const result = await removeProfileAvatar();
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      <div className="relative">
        <CreatorAvatar
          name={name}
          seed={user?.id ?? "guest"}
          avatarUrl={profile?.avatarUrl}
          size={size}
          className={avatarClassName}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || !profile}
          aria-label="Change profile picture"
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg bg-ink text-white shadow-card transition-transform hover:scale-105 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Camera size={14} aria-hidden />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {showRemove && profile?.avatarUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={busy}
          className="text-xs font-semibold text-ink-soft hover:text-red-600 disabled:opacity-60"
        >
          Remove photo
        </button>
      )}
      {error && <p className="max-w-[16rem] text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
