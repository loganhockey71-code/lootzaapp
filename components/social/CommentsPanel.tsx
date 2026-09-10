"use client";

import { useState } from "react";
import { CornerDownRight, Send } from "lucide-react";
import { useAppState } from "@/lib/state/AppStateContext";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { CommentEntry } from "@/lib/types";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CommentRow({
  comment,
  replies,
  onReply,
}: {
  comment: CommentEntry;
  replies: CommentEntry[];
  onReply: (parentId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <CreatorAvatar name={comment.authorName} seed={comment.authorName} size={30} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-semibold text-ink">{comment.authorName}</p>
            <span className="text-xs text-ink-soft">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-ink-soft">{comment.body}</p>
          <button
            onClick={() => onReply(comment.id)}
            className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            <CornerDownRight size={12} aria-hidden /> Reply
          </button>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="ml-10 flex flex-col gap-3 border-l-2 border-border pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <CreatorAvatar name={reply.authorName} seed={reply.authorName} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold text-ink">{reply.authorName}</p>
                  <span className="text-xs text-ink-soft">{timeAgo(reply.createdAt)}</span>
                </div>
                <p className="text-sm text-ink-soft">{reply.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentsPanel({ targetId, className }: { targetId: string; className?: string }) {
  const { commentsFor, addComment } = useAppState();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const all = commentsFor(targetId);
  const topLevel = all.filter((c) => !c.parentId);
  const repliesOf = (id: string) => all.filter((c) => c.parentId === id).reverse();
  const replyingToComment = replyTo ? all.find((c) => c.id === replyTo) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    addComment(targetId, text, replyTo);
    setText("");
    setReplyTo(null);
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <form onSubmit={submit} className="flex flex-col gap-2">
        {replyingToComment && (
          <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-ink-soft">
            Replying to <strong className="text-ink">{replyingToComment.authorName}</strong>
            <button type="button" onClick={() => setReplyTo(null)} className="font-semibold text-ink hover:underline">
              Cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={replyTo ? "Write a reply..." : "Ask a question or leave a comment..."}
            className="h-11 flex-1 rounded-full border border-border bg-bg px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <Button type="submit" size="md" className="gap-1.5" disabled={!text.trim()}>
            <Send size={15} aria-hidden />
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-5">
        {topLevel.length === 0 && <p className="text-sm text-ink-soft">No comments yet. Start the conversation.</p>}
        {topLevel.map((comment) => (
          <CommentRow key={comment.id} comment={comment} replies={repliesOf(comment.id)} onReply={setReplyTo} />
        ))}
      </div>
    </div>
  );
}
