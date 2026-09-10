"use client";

import { Modal } from "@/components/ui/Modal";
import { CommentsPanel } from "./CommentsPanel";

export function CommentSheet({
  targetId,
  open,
  onClose,
}: {
  targetId: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-h-[80vh] overflow-y-auto">
      <h3 className="font-display mb-4 text-lg font-extrabold text-ink">Comments</h3>
      <CommentsPanel targetId={targetId} />
    </Modal>
  );
}
