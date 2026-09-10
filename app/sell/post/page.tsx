"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, Upload, RefreshCw, Check, ImagePlus, Aperture } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductPicker } from "@/components/sell/ProductPicker";
import { CollaboratorPicker } from "@/components/sell/CollaboratorPicker";
import { creators } from "@/lib/data/creators";
import { getProductsByCreator } from "@/lib/data/products";
import { useAppState } from "@/lib/state/AppStateContext";
import { useCamera } from "@/lib/hooks/useCamera";
import type { FeedPost } from "@/lib/types";

const CURRENT_USER = creators.find((c) => c.id === "pixelmax")!;

export default function SellPostPage() {
  const { addPost, myListings } = useAppState();
  const myProducts = [...getProductsByCreator(CURRENT_USER.id), ...myListings];

  const { videoRef, active, error, start, stop } = useCamera({ video: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setMediaUrl(canvas.toDataURL("image/jpeg", 0.9));
    stop();
  }

  function handleFileUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMediaUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function retake() {
    setMediaUrl(null);
  }

  function handlePost() {
    if (!mediaUrl || !caption.trim()) return;
    const post: FeedPost = {
      id: `post-${Date.now().toString(36)}`,
      type: "image",
      creatorId: CURRENT_USER.id,
      mediaUrl,
      coverSeed: `post-${Date.now()}`,
      category: myProducts.find((p) => p.id === productId)?.category ?? null,
      caption: caption.trim(),
      linkedProductId: productId,
      likes: 0,
      postedAt: "Just now",
      collaboratorId,
    };
    addPost(post);
    setPosted(true);
  }

  if (posted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-[var(--shadow-glow-primary)]">
          <ImagePlus size={32} aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-extrabold text-ink">Post shared!</h1>
        <p className="text-ink-soft">Your post is now live in Discover.</p>
        <Link href="/discover">
          <Button size="lg">Go to Discover</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-center text-2xl font-extrabold text-ink sm:text-3xl">Create a post</h1>
      <p className="mt-1 text-center text-ink-soft">Take or upload a photo and add a caption.</p>

      <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
        {!mediaUrl ? (
          <div className="flex flex-col gap-4">
            <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-ink sm:aspect-video">
              {active ? (
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/60">
                  <Camera size={32} aria-hidden />
                  <p className="text-sm">Camera preview will appear here</p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-3">
              {!active ? (
                <Button variant="outline" className="gap-1.5" onClick={start}>
                  <Camera size={16} aria-hidden /> Use Camera
                </Button>
              ) : (
                <Button className="gap-1.5" onClick={capturePhoto}>
                  <Aperture size={16} aria-hidden /> Capture Photo
                </Button>
              )}

              <label className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-ink/20 hover:bg-surface-2">
                <Upload size={16} aria-hidden /> Upload a photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-2xl bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element -- locally captured data URL, not an optimizable remote asset */}
              <img src={mediaUrl} alt="Post preview" className="aspect-[4/5] w-full object-cover sm:aspect-video" />
              <button
                onClick={retake}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/80"
              >
                <RefreshCw size={13} aria-hidden /> Retake
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Caption</span>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Write a caption for this post"
                className="input resize-none"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Link to a product (optional)</span>
              <ProductPicker products={myProducts} value={productId} onChange={setProductId} allowNone />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Collaborator (optional)</span>
              <CollaboratorPicker value={collaboratorId} onChange={setCollaboratorId} excludeId={CURRENT_USER.id} />
            </div>

            <Button size="lg" className="w-full gap-1.5" onClick={handlePost} disabled={!caption.trim()}>
              <Check size={18} aria-hidden /> Post
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
