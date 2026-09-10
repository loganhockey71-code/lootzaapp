"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Check, X, ArrowLeft, ArrowRight, Sparkles, Banknote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { ProductArtwork } from "@/components/product/ProductArtwork";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { FileUploadZone } from "@/components/sell/FileUploadZone";
import { ImageUploadZone } from "@/components/sell/ImageUploadZone";
import { PayoutStatusBanner } from "@/components/sell/PayoutStatusBanner";
import { categories } from "@/lib/data/categories";
import { creators } from "@/lib/data/creators";
import { CATEGORY_ICONS } from "@/lib/icons";
import { useAppState } from "@/lib/state/AppStateContext";
import {
  uploadPreviewImage,
  uploadProductFile,
  removeUploadedFiles,
  validatePreviewImage,
  validateProductFile,
} from "@/lib/supabase/storage";
import { fetchPayoutStatus, startPayoutOnboarding, type PayoutStatus } from "@/lib/supabase/connect";
import { cn, formatFileSize, formatPrice, slugify } from "@/lib/utils";
import type { CategorySlug, Product } from "@/lib/types";

const CURRENT_USER = creators.find((c) => c.id === "pixelmax")!;
const STEPS = ["Basics", "File", "Details", "Pricing", "Review"];

interface FormState {
  title: string;
  tagline: string;
  category: CategorySlug;
  file: File | null;
  coverImage: string | null;
  coverImageFile: File | null;
  description: string;
  price: string;
  originalPrice: string;
  usageRights: "Personal Use" | "Commercial Use";
  fileTypes: string[];
  fileTypeDraft: string;
  compatibleWith: string[];
  compatibleDraft: string;
  included: string[];
  includedDraft: string;
  limitedQuantityEnabled: boolean;
  limitedQuantityTotal: string;
  scheduledReleaseEnabled: boolean;
  releaseAt: string;
}

const initialForm: FormState = {
  title: "",
  tagline: "",
  category: "graphics",
  file: null,
  coverImage: null,
  coverImageFile: null,
  description: "",
  price: "",
  originalPrice: "",
  usageRights: "Personal Use",
  fileTypes: [],
  fileTypeDraft: "",
  compatibleWith: [],
  compatibleDraft: "",
  included: [],
  includedDraft: "",
  limitedQuantityEnabled: false,
  limitedQuantityTotal: "",
  scheduledReleaseEnabled: false,
  releaseAt: "",
};

export default function SellProductPage() {
  const { user, addListing, createSupabaseProduct } = useAppState();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [dropped, setDropped] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [coverImageError, setCoverImageError] = useState<string | null>(null);

  // A paid listing can't be sold until Stripe can actually pay the seller —
  // app/api/checkout already refuses the sale server-side, but a seller
  // shouldn't be able to publish the listing at all in that state. Free
  // listings never touch Stripe, so this check is skipped for them.
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | null>(null);
  const [payoutStatusLoading, setPayoutStatusLoading] = useState(true);
  const [startingOnboarding, setStartingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPayoutStatus()
      .then((s) => {
        if (active) setPayoutStatus(s);
      })
      .finally(() => {
        if (active) setPayoutStatusLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isPaidProduct = Number(form.price) > 0;
  // Fails closed: still-loading or unknown status blocks publishing a paid
  // listing just like an explicit "not enabled" would, so there's no window
  // where a paid listing can be dropped before the real status is known.
  const blockedOnPayouts = isPaidProduct && (payoutStatusLoading || payoutStatus?.payoutsEnabled !== true);

  async function handleConnectStripe() {
    setOnboardingError(null);
    setStartingOnboarding(true);
    const result = await startPayoutOnboarding();
    if (!result.ok) {
      setStartingOnboarding(false);
      setOnboardingError(result.error);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const stepValid = [
    form.title.trim().length > 1 && form.tagline.trim().length > 1,
    form.file !== null,
    form.description.trim().length > 0,
    Number(form.price) > 0,
    true,
  ];

  function addIncluded() {
    if (!form.includedDraft.trim()) return;
    update("included", [...form.included, form.includedDraft.trim()]);
    update("includedDraft", "");
  }

  function removeIncluded(i: number) {
    update(
      "included",
      form.included.filter((_, idx) => idx !== i)
    );
  }

  function addFileType() {
    const value = form.fileTypeDraft.trim();
    if (!value || form.fileTypes.includes(value)) return;
    update("fileTypes", [...form.fileTypes, value]);
    update("fileTypeDraft", "");
  }

  function removeFileType(i: number) {
    update(
      "fileTypes",
      form.fileTypes.filter((_, idx) => idx !== i)
    );
  }

  function addCompatible() {
    const value = form.compatibleDraft.trim();
    if (!value || form.compatibleWith.includes(value)) return;
    update("compatibleWith", [...form.compatibleWith, value]);
    update("compatibleDraft", "");
  }

  function removeCompatible(i: number) {
    update(
      "compatibleWith",
      form.compatibleWith.filter((_, idx) => idx !== i)
    );
  }

  function handleFileChange(file: File | null) {
    if (file) {
      const error = validateProductFile(file);
      if (error) {
        setFileError(error);
        return;
      }
    }
    setFileError(null);
    update("file", file);
  }

  function handleCoverImageChange(file: File | null, dataUrl: string | null) {
    if (file) {
      const error = validatePreviewImage(file);
      if (error) {
        setCoverImageError(error);
        return;
      }
    }
    setCoverImageError(null);
    update("coverImageFile", file);
    update("coverImage", dataUrl);
  }

  async function handleDrop() {
    if (!user) {
      setSubmitError("You must be logged in to drop a product.");
      return;
    }
    if (!form.file) {
      setSubmitError("Attach a product file before dropping this listing.");
      return;
    }
    if (blockedOnPayouts) {
      setSubmitError("Set up Stripe payouts before publishing a paid product.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    const id = crypto.randomUUID();
    const slug = `${slugify(form.title)}-${Date.now().toString(36)}`;
    const fileExt = form.file.name.split(".").pop();
    const limitedTotal = Number(form.limitedQuantityTotal);
    const hasLimitedQuantity = form.limitedQuantityEnabled && limitedTotal > 0;
    const hasScheduledRelease = form.scheduledReleaseEnabled && form.releaseAt.trim().length > 0;

    // Uploads happen first — the listing is only created once they both succeed.
    let previewPath: string | null = null;
    let thumbnailUrl: string | null = null;
    let productFilePath: string | null = null;
    try {
      if (form.coverImageFile) {
        const preview = await uploadPreviewImage(user.id, id, form.coverImageFile);
        previewPath = preview.path;
        thumbnailUrl = preview.publicUrl;
      }
      const uploaded = await uploadProductFile(user.id, id, form.file);
      productFilePath = uploaded.path;
    } catch (err) {
      // Clean up whichever upload(s) already succeeded before this one failed.
      await removeUploadedFiles(previewPath, productFilePath);
      setSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : "Failed to upload your files. Please try again.");
      return;
    }

    const result = await createSupabaseProduct({
      id,
      sellerId: user.id,
      title: form.title.trim(),
      tagline: form.tagline.trim(),
      description: form.description.split("\n").map((p) => p.trim()).filter(Boolean),
      slug,
      category: form.category,
      price: Number(form.price) || 0,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      usageRights: form.usageRights,
      fileTypes: form.fileTypes.length > 0 ? form.fileTypes : fileExt ? [`.${fileExt}`] : [],
      compatibleWith: form.compatibleWith,
      whatsIncluded: form.included,
      fileSizeBytes: form.file.size,
      thumbnailUrl,
      productFilePath,
      badge: "new",
      limitedQuantityTotal: hasLimitedQuantity ? limitedTotal : undefined,
      releaseAt: hasScheduledRelease ? new Date(form.releaseAt).toISOString() : undefined,
    });

    setSubmitting(false);

    if (!result.ok) {
      // The row never made it in — don't leave orphaned files behind for it.
      await removeUploadedFiles(previewPath, productFilePath);
      setSubmitError(result.error);
      return;
    }

    // Same id/slug as the row that was just inserted, so this mirrors it into
    // myListings (existing XP/challenge rewards, unchanged) without duplicating
    // it once useAllProducts() also picks it up from Supabase.
    addListing(result.product);
    setDropped(result.product);
  }

  if (dropped) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-[var(--shadow-glow-primary)]">
          <Flame size={32} aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-extrabold text-ink">You dropped it!</h1>
        <p className="text-ink-soft">
          <strong>{dropped.title}</strong> is now live on your seller dashboard, saved to your account.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard">
            <Button size="lg">Go to Dashboard</Button>
          </Link>
          <Link href={`/product/${dropped.slug}`}>
            <Button size="lg" variant="outline">
              View Drop
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-center text-2xl font-extrabold text-ink sm:text-3xl">
        Drop a new product
      </h1>
      <p className="mt-1 text-center text-ink-soft">List a digital product on Lootza in a few quick steps.</p>

      <div className="mx-auto mt-8 flex max-w-lg items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                i < step
                  ? "bg-primary-600 text-white"
                  : i === step
                    ? "bg-primary-600 text-white ring-4 ring-primary-100"
                    : "bg-surface-2 text-ink-soft"
              )}
            >
              {i < step ? <Check size={16} aria-hidden /> : i + 1}
            </div>
            <span className={cn("text-[11px] font-medium", i === step ? "text-ink" : "text-ink-soft")}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <Field label="Product title">
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Neon Cyberpunk UI Kit"
                className="input"
              />
            </Field>
            <Field label="Tagline">
              <input
                value={form.tagline}
                onChange={(e) => update("tagline", e.target.value)}
                placeholder="One line that sells it"
                className="input"
              />
            </Field>
            <Field label="Category">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.slug];
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => update("category", cat.slug)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-colors",
                        form.category === cat.slug
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-border text-ink-soft hover:border-primary-300"
                      )}
                    >
                      <Icon size={18} aria-hidden />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <Field
              label="Product file"
              hint="The actual file buyers will eventually download. It's uploaded to a private bucket — buyer downloads aren't wired up yet, so for now only you (and Lootza) can access it."
            >
              <FileUploadZone file={form.file} onChange={handleFileChange} />
              {fileError && <span className="text-xs font-medium text-red-600">{fileError}</span>}
            </Field>
            <Field label="Cover image (optional)" hint="The main image buyers see on your listing. Without one, Lootza generates a themed cover automatically.">
              <ImageUploadZone image={form.coverImage} onChange={handleCoverImageChange} />
              {coverImageError && <span className="text-xs font-medium text-red-600">{coverImageError}</span>}
            </Field>
            <div className="flex items-start gap-2 rounded-2xl bg-surface-2 p-4 text-sm text-ink-soft">
              <Sparkles size={16} className="mt-0.5 shrink-0" aria-hidden />
              <p>
                Rarity is no longer something you choose. Lootza assigns it automatically based on how
                unique this product is compared to everything else on the marketplace. You&apos;ll see it
                update once your drop is live.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <Field label="Description" hint="One idea per line. Each becomes a paragraph.">
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                placeholder="What is it, and why should someone buy it?"
                className="input resize-none"
              />
            </Field>
            <Field label="What's included" hint="Add each item, then press Enter.">
              <div className="flex gap-2">
                <input
                  value={form.includedDraft}
                  onChange={(e) => update("includedDraft", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addIncluded();
                    }
                  }}
                  placeholder="e.g. 40 Editable Screens"
                  className="input"
                />
                <Button type="button" variant="secondary" onClick={addIncluded}>
                  Add
                </Button>
              </div>
              {form.included.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {form.included.map((item, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-sm">
                      {item}
                      <button onClick={() => removeIncluded(i)} className="text-ink-soft hover:text-red-500">
                        <X size={14} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
            <ChipField
              label="File types (optional)"
              hint="Add each extension, then press Enter."
              placeholder="e.g. .fig"
              draft={form.fileTypeDraft}
              onDraftChange={(v) => update("fileTypeDraft", v)}
              items={form.fileTypes}
              onAdd={addFileType}
              onRemove={removeFileType}
            />
            <ChipField
              label="Compatible with (optional)"
              hint="Add each app or platform, then press Enter."
              placeholder="e.g. Figma"
              draft={form.compatibleDraft}
              onDraftChange={(v) => update("compatibleDraft", v)}
              items={form.compatibleWith}
              onAdd={addCompatible}
              onRemove={removeCompatible}
            />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <Field label="Price (USD)">
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="29"
                className="input"
              />
            </Field>
            <Field label="Original price (optional)" hint="Shown crossed out with a discount badge.">
              <input
                type="number"
                min={0}
                value={form.originalPrice}
                onChange={(e) => update("originalPrice", e.target.value)}
                placeholder="49"
                className="input"
              />
            </Field>
            <Field label="Usage rights">
              <div className="flex gap-2">
                {(["Personal Use", "Commercial Use"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => update("usageRights", l)}
                    className={cn(
                      "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                      form.usageRights === l ? "border-primary-600 bg-primary-50 text-primary-700" : "border-border text-ink-soft"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <p className="text-sm font-semibold text-ink">Advanced options</p>
              <Toggle
                checked={form.limitedQuantityEnabled}
                onChange={(checked) => update("limitedQuantityEnabled", checked)}
                label="Limit how many are available"
                hint="Buyers will see how many units are left."
              />
              {form.limitedQuantityEnabled && (
                <input
                  type="number"
                  min={1}
                  value={form.limitedQuantityTotal}
                  onChange={(e) => update("limitedQuantityTotal", e.target.value)}
                  placeholder="e.g. 100"
                  className="input"
                />
              )}
              <Toggle
                checked={form.scheduledReleaseEnabled}
                onChange={(checked) => update("scheduledReleaseEnabled", checked)}
                label="Schedule a release"
                hint="The listing appears now with a countdown, but can't be bought until this time."
              />
              {form.scheduledReleaseEnabled && (
                <input
                  type="datetime-local"
                  value={form.releaseAt}
                  onChange={(e) => update("releaseAt", e.target.value)}
                  className="input"
                />
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-5">
            {isPaidProduct && <PayoutStatusBanner />}
            <p className="text-sm font-semibold text-ink-soft">Preview</p>
            <div className="overflow-hidden rounded-2xl ring-1 ring-border">
              <ProductArtwork
                product={{
                  coverImage: form.coverImage,
                  coverSeed: form.title || "preview",
                  category: form.category,
                  title: form.title || "Your product",
                }}
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="flex flex-col gap-2 bg-surface p-4">
                <div className="flex items-center gap-2 text-xs text-ink-soft">
                  <CreatorAvatar name={CURRENT_USER.name} seed={CURRENT_USER.avatarSeed} size={20} />
                  {CURRENT_USER.name}
                </div>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                  <Sparkles size={12} aria-hidden /> Rarity calculated after drop
                </span>
                <h3 className="font-display font-bold text-ink">{form.title || "Untitled product"}</h3>
                <p className="text-sm text-ink-soft">{form.tagline || "No tagline yet"}</p>
                <span className="text-lg font-extrabold text-ink">
                  {formatPrice(Number(form.price) || 0)}
                </span>
              </div>
            </div>
            <p className="text-xs text-ink-soft">
              Category <strong className="text-ink">{categories.find((c) => c.slug === form.category)?.name}</strong>
              {" · "}
              {form.file ? `${form.file.name} (${formatFileSize(form.file.size)})` : "No file attached"}
              {" · "}
              {form.included.length} included item{form.included.length === 1 ? "" : "s"}
              {" · "}
              {form.usageRights}
              {form.limitedQuantityEnabled && Number(form.limitedQuantityTotal) > 0 && (
                <>
                  {" · "}
                  Limited to {form.limitedQuantityTotal}
                </>
              )}
              {form.scheduledReleaseEnabled && form.releaseAt && (
                <>
                  {" · "}
                  Releases {new Date(form.releaseAt).toLocaleString()}
                </>
              )}
            </p>
            {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}
            {onboardingError && <p className="text-sm font-medium text-red-600">{onboardingError}</p>}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <Button
            variant="ghost"
            className="gap-1.5"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft size={16} aria-hidden /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="gap-1.5" onClick={() => setStep((s) => s + 1)} disabled={!stepValid[step]}>
              Continue <ArrowRight size={16} aria-hidden />
            </Button>
          ) : blockedOnPayouts ? (
            <Button onClick={handleConnectStripe} className="gap-1.5" disabled={startingOnboarding || payoutStatusLoading}>
              <Banknote size={16} aria-hidden />
              {payoutStatusLoading ? "Checking payout status…" : startingOnboarding ? "Redirecting…" : "Set Up Payouts to Publish"}
            </Button>
          ) : (
            <Button onClick={handleDrop} className="gap-1.5" disabled={submitting}>
              <Flame size={16} aria-hidden /> {submitting ? "Dropping…" : "Drop It"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

function ChipField({
  label,
  hint,
  placeholder,
  draft,
  onDraftChange,
  items,
  onAdd,
  onRemove,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  items: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="input"
        />
        <Button type="button" variant="secondary" onClick={onAdd}>
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink"
            >
              {item}
              <button type="button" onClick={() => onRemove(i)} className="text-ink-soft hover:text-red-500">
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}
