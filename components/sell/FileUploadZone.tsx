"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileArchive, X, RefreshCw } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";

export function FileUploadZone({
  file,
  onChange,
  accept,
  label = "Drag & drop your product file here",
  hint = "or click to browse from your computer",
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    if (files && files[0]) onChange(files[0]);
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-ink-soft">
            <FileArchive size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
            <p className="text-xs text-ink-soft">{formatFileSize(file.size)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"
            aria-label="Replace file"
          >
            <RefreshCw size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-red-500"
            aria-label="Remove file"
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
        "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
        dragOver ? "border-primary-400 bg-primary-50" : "border-border bg-surface-2 hover:border-ink/20"
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft">
        <UploadCloud size={22} aria-hidden />
      </span>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="text-xs text-ink-soft">{hint}</p>
      {hiddenInput}
    </div>
  );
}
