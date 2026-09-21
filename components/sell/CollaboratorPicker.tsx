"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { useAppState } from "@/lib/state/AppStateContext";
import { searchProfiles } from "@/lib/supabase/profiles";
import { profileToCreator } from "@/lib/creators";
import type { Creator } from "@/lib/types";

/** Picks a collaborator from real Lootza accounts by searching usernames/display names. */
export function CollaboratorPicker({
  value,
  onChange,
  excludeId,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  excludeId: string;
}) {
  const { getCreator } = useAppState();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; creators: Creator[] } | null>(null);
  // Remember who was picked so the chip still renders after the result list changes.
  const [picked, setPicked] = useState<Creator | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      searchProfiles(q, 8)
        .then((list) => {
          if (active) setResults({ query: q, creators: list.map(profileToCreator).filter((c) => c.id !== excludeId) });
        })
        .catch((err: Error) => console.error("Collaborator search failed:", err.message));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open, excludeId]);

  const selected = value ? (picked?.id === value ? picked : (getCreator(value) ?? null)) : null;
  const trimmed = query.trim();
  const options = results && results.query === trimmed ? results.creators : [];

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 p-3">
        <div className="flex items-center gap-2.5">
          <CreatorAvatar name={selected.name} seed={selected.avatarSeed} avatarUrl={selected.avatar} size={32} />
          <div>
            <p className="text-sm font-semibold text-ink">{selected.name}</p>
            <p className="text-xs text-ink-soft">Collaborator</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setPicked(null);
          }}
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
        <p className="text-sm font-semibold text-ink">Find a collaborator</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="text-xs font-semibold text-ink-soft hover:text-ink"
        >
          Cancel
        </button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by username"
        className="input mb-2"
        autoFocus
      />
      {trimmed.length < 2 ? (
        <p className="px-1 py-2 text-xs text-ink-soft">Type at least 2 characters.</p>
      ) : options.length === 0 ? (
        <p className="px-1 py-2 text-xs text-ink-soft">No matching users.</p>
      ) : (
        <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
          {options.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setPicked(c);
                onChange(c.id);
                setOpen(false);
                setQuery("");
              }}
              className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-surface-2"
            >
              <CreatorAvatar name={c.name} seed={c.avatarSeed} avatarUrl={c.avatar} size={28} />
              <span className="truncate text-sm text-ink">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
