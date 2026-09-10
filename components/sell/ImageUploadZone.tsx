"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageUploadZone({
  image,
  onChange,
  label = "Drag & drop a cover image here",
  hint = "or click to browse. This is the main image buyers will see",
}: {
  image: string | null;
  /** Called with the raw File (for uploading) and a local data-URL (for this preview). */
  onChange: (file: File | null, dataUrl: string | null) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(file, reader.result as string);
    reader.readAsDataURL(file);
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  if (image) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element -- locally-generated data URL preview, no static import list */}
        <img src={image} alt="Cover preview" className="aspect-[16/9] w-full object-cover" />
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-soft shadow-sm backdrop-blur hover:text-ink"
            aria-label="Replace cover image"
          >
            <RefreshCw size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-soft shadow-sm backdrop-blur hover:text-red-500"
            aria-label="Remove cover image"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        {hiddenInput}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
        dragOver ? "border-primary-400 bg-primary-50" : "border-border bg-surface-2 hover:border-ink/20"
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft">
        <ImagePlus size={22} aria-hidden />
      </span>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="text-xs text-ink-soft">{hint}</p>
      {hiddenInput}
    </div>
  );
}
