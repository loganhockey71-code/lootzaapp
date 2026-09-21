"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, Circle, Square, Upload, RefreshCw, Check, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductPicker } from "@/components/sell/ProductPicker";
import { CollaboratorPicker } from "@/components/sell/CollaboratorPicker";
import { useAppState } from "@/lib/state/AppStateContext";
import { useCamera } from "@/lib/hooks/useCamera";
import { uploadPostMedia, removePostMedia, validatePostMedia } from "@/lib/supabase/storage";

export default function SellVideoPage() {
  const { user, myProducts, createSupabasePost } = useAppState();

  const { videoRef, active, error, start, stop } = useCamera({ video: true, audio: true });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [recording, setRecording] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  // The actual file that gets uploaded; mediaUrl is only its local preview.
  const [mediaFile, setMediaFile] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [chosenProductId, setProductId] = useState<string | null>(null);
  // Defaults to the first of THIS user's own products until they pick one.
  const productId = chosenProductId ?? myProducts[0]?.id ?? null;
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  function startRecording() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setMediaFile(blob);
      setMediaUrl(URL.createObjectURL(blob));
      stop();
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function handleFileUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setSubmitError(null);
    setMediaFile(file);
    setMediaUrl(URL.createObjectURL(file));
  }

  function retake() {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(null);
    setMediaFile(null);
  }

  async function handlePost() {
    if (!user || !mediaFile || !productId) return;
    const invalid = validatePostMedia(mediaFile, "video");
    if (invalid) {
      setSubmitError(invalid);
      return;
    }
    setSubmitError(null);
    setSubmitting(true);

    // Upload first (into this user's own storage folder), then create the row that
    // points at it; the row is owned by the signed-in user via author_id.
    const id = crypto.randomUUID();
    let uploaded: { path: string; publicUrl: string };
    try {
      uploaded = await uploadPostMedia(user.id, id, mediaFile);
    } catch (err) {
      setSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : "Couldn't upload your video. Please try again.");
      return;
    }

    const result = await createSupabasePost({
      id,
      type: "video",
      mediaUrl: uploaded.publicUrl,
      category: myProducts.find((p) => p.id === productId)?.category ?? null,
      caption: caption.trim(),
      linkedProductId: productId,
      collaboratorId,
    });
    setSubmitting(false);
    if (!result.ok) {
      await removePostMedia(uploaded.path);
      setSubmitError(result.error);
      return;
    }
    setPosted(true);
  }

  if (posted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-[var(--shadow-glow-primary)]">
          <VideoIcon size={32} aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-extrabold text-ink">Video posted!</h1>
        <p className="text-ink-soft">Your video is now live in Discover, connected to your product.</p>
        <Link href="/discover">
          <Button size="lg">Go to Discover</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-center text-2xl font-extrabold text-ink sm:text-3xl">
        Create a video
      </h1>
      <p className="mt-1 text-center text-ink-soft">Record from your camera or upload a clip.</p>

      <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
        {!mediaUrl ? (
          <div className="flex flex-col gap-4">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-ink">
              {active ? (
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/60">
                  <Camera size={32} aria-hidden />
                  <p className="text-sm">Camera preview will appear here</p>
                </div>
              )}
              {recording && (
                <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                  <Circle size={8} className="fill-white" aria-hidden /> REC
                </span>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-3">
              {!active ? (
                <Button variant="outline" className="gap-1.5" onClick={start}>
                  <Camera size={16} aria-hidden /> Use Camera
                </Button>
              ) : recording ? (
                <Button variant="danger" className="gap-1.5" onClick={stopRecording}>
                  <Square size={16} aria-hidden /> Stop Recording
                </Button>
              ) : (
                <Button className="gap-1.5" onClick={startRecording}>
                  <Circle size={16} aria-hidden /> Start Recording
                </Button>
              )}

              <label className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-ink/20 hover:bg-surface-2">
                <Upload size={16} aria-hidden /> Upload a file
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-2xl bg-ink">
              <video src={mediaUrl} controls className="aspect-video w-full object-cover" />
              <button
                onClick={retake}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/80"
              >
                <RefreshCw size={13} aria-hidden /> Retake
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Caption (optional)</span>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Tell viewers what they're watching"
                className="input"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Connect to a product</span>
              <ProductPicker products={myProducts} value={productId} onChange={setProductId} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Collaborator (optional)</span>
              <CollaboratorPicker value={collaboratorId} onChange={setCollaboratorId} excludeId={user?.id ?? ""} />
            </div>

            {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}

            <Button
              size="lg"
              className="w-full gap-1.5"
              onClick={handlePost}
              disabled={!productId || submitting}
            >
              <Check size={18} aria-hidden /> {submitting ? "Posting…" : "Post Video"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
