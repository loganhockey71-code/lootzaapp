"use client";

import { useState } from "react";
import { UserPlus, X, BadgeCheck } from "lucide-react";
import { creators } from "@/lib/data/creators";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";

export function CollaboratorPicker({
  value,
  onChange,
  excludeId,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  excludeId: string;
}) {
  const [open, setOpen] = useState(false);
  const options = creators.filter((c) => c.id !== excludeId);
  const selected = options.find((c) => c.id === value) ?? null;

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 p-3">
        <div className="flex items-center gap-2.5">
          <CreatorAvatar name={selected.name} seed={selected.avatarSeed} avatarUrl={selected.avatar} size={32} />
          <div>
            <p className="flex items-center gap-1 text-sm font-semibold text-ink">
              {selected.name}
              {selected.verified && <BadgeCheck size={13} className="text-primary-500" aria-hidden />}
            </p>
            <p className="text-xs text-ink-soft">Collaborator</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-red-500"
          aria-label="Remove collaborator"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-full border border-dashed border-border px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-primary-300 hover:text-primary-700"
      >
        <UserPlus size={15} aria-hidden /> Add Collaborator
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Choose a collaborator</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-ink-soft hover:text-ink">
          Cancel
        </button>
      </div>
      <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
        {options.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              onChange(c.id);
              setOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-surface-2"
          >
            <CreatorAvatar name={c.name} seed={c.avatarSeed} avatarUrl={c.avatar} size={28} />
            <span className="truncate text-sm text-ink">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
