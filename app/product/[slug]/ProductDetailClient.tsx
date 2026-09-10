"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  BadgeCheck,
  Heart,
  ShoppingBag,
  CheckCircle2,
  Bookmark,
  Check,
  Share2,
  Zap,
  Lock,
  Undo2,
  MessageCircle,
  Download,
  Loader2,
} from "lucide-react";
import type { Creator, Product } from "@/lib/types";
import { useAppState } from "@/lib/state/AppStateContext";
import { requestDownloadUrl } from "@/lib/supabase/download";
import { cn, discountPercent, formatCompactNumber, formatPrice, isReleased, ratingBreakdown } from "@/lib/utils";
import { getCategory } from "@/lib/data/categories";
import { ProductGallery } from "@/components/product/ProductGallery";
import { BuyModal } from "@/components/product/BuyModal";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Tabs } from "@/components/ui/Tabs";
import { calculateRarity } from "@/lib/rarity";
import { useAllProducts } from "@/lib/hooks/useAllProducts";
import { CommentsPanel } from "@/components/social/CommentsPanel";
import { ReviewForm } from "@/components/social/ReviewForm";
import { CountdownTimer } from "@/components/product/CountdownTimer";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews" },
  { id: "changelog", label: "Changelog" },
  { id: "comments", label: "Comments" },
];

const CHANGELOG = [
  { version: "v2.3", date: "May 12, 2024", note: "Added dark mode variants for every screen." },
  { version: "v2.2", date: "Mar 2, 2024", note: "Refreshed icon set and fixed component naming." },
  { version: "v2.0", date: "Dec 18, 2023", note: "Initial public release." },
];

export function ProductDetailClient({
  product,
  creator,
  related,
}: {
  product: Product;
  creator: Creator;
  related: Product[];
}) {
  const {
    isLiked,
    toggleLike,
    isSaved,
    toggleSave,
    isFollowed,
    toggleFollow,
    isOwned,
    commentsFor,
    reviewsFor,
    purchase,
    refetchPurchases,
  } = useAppState();
  const allProducts = useAllProducts();
  const rarity = calculateRarity(product, allProducts);
  const [buyOpen, setBuyOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [released, setReleased] = useState(() => isReleased(product));
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentConfirmTimedOut, setPaymentConfirmTimedOut] = useState(false);

  useEffect(() => {
    if (released || !product.releaseAt) return;
    const id = setInterval(() => setReleased(isReleased(product)), 1000);
    return () => clearInterval(id);
  }, [released, product]);

  // Returning from a successful Stripe Checkout: the purchases row is only
  // created once the webhook processes the payment, which can lag slightly
  // behind this redirect — so poll briefly for it instead of assuming it's
  // there yet. Strip the query param immediately so a later refresh of this
  // page doesn't replay the same "confirming" flow.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    window.history.replaceState(null, "", window.location.pathname);

    let cancelled = false;
    // Reacting to a URL param set by an external redirect (Stripe), not to
    // React state — there's no way to derive this during render instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfirmingPayment(true);
    setPaymentConfirmTimedOut(false);

    (async () => {
      for (let attempt = 0; attempt < 8; attempt++) {
        if (cancelled) return;
        const list = await refetchPurchases();
        if (cancelled) return;
        if (list.some((p) => p.productId === product.id)) {
          purchase(product.id);
          setConfirmingPayment(false);
          setBuyOpen(true);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!cancelled) {
        setConfirmingPayment(false);
        setPaymentConfirmTimedOut(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    const result = await requestDownloadUrl(product.id);
    setDownloading(false);
    if (!result.ok) {
      setDownloadError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  const liked = isLiked(product.id);
  const saved = isSaved(product.id);
  const following = isFollowed(creator.id);
  const owned = isOwned(product.id);
  const discount = discountPercent(product.price, product.originalPrice);
  const commentCount = commentsFor(product.id).length;
  const userReviews = reviewsFor(product.id);
  const allReviews = [...userReviews, ...product.reviews];
  const reviewCount = product.reviewCount + userReviews.length;
  const breakdown = ratingBreakdown(product.rating, reviewCount);
  const category = getCategory(product.category);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft">
        <Link href="/discover" className="hover:text-primary-600">
          Discover
        </Link>
        <ChevronRight size={14} aria-hidden />
        {category && (
          <>
            <Link href={`/categories/${category.slug}`} className="hover:text-primary-600">
              {category.name}
            </Link>
            <ChevronRight size={14} aria-hidden />
          </>
        )}
        <span className="text-ink">{product.title}</span>
      </nav>

      <style>{`
        .product-detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-areas: "gallery" "buy" "main" "side";
        }
        @media (min-width: 1024px) {
          .product-detail-grid {
            grid-template-columns: 1fr 360px;
            grid-template-areas: "gallery buy" "main side";
          }
        }
      `}</style>
      <div className="product-detail-grid gap-6 lg:gap-8">
        <div style={{ gridArea: "gallery" }}>
          <ProductGallery product={product} />
        </div>

        <div style={{ gridArea: "buy" }} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <RarityBadge rarity={rarity} />
            {product.badge && <Badge tone={product.badge} />}
            {product.drop && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                {product.drop.tag === "limited" ? "Limited Drop" : "Event Drop"}
              </span>
            )}
          </div>
          {product.drop && (
            <div className="flex flex-col gap-1.5 rounded-2xl bg-red-50 p-3 text-red-700">
              <CountdownTimer endsAt={product.drop.endsAt} />
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-red-100">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: `${(product.drop.quantityRemaining / product.drop.quantityTotal) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold">
                {product.drop.quantityRemaining} of {product.drop.quantityTotal} left
              </span>
            </div>
          )}
          {product.limitedQuantity && (
            <div className="flex flex-col gap-1.5 rounded-2xl bg-accent-50 p-3 text-accent-600">
              <span className="text-xs font-bold">
                {product.limitedQuantity.remaining} of {product.limitedQuantity.total} left
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-500/20">
                <div
                  className="h-full rounded-full bg-accent-500"
                  style={{
                    width: `${Math.max(4, (product.limitedQuantity.remaining / product.limitedQuantity.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
          {product.releaseAt && !released && (
            <div className="rounded-2xl bg-surface-2 p-3 text-ink-soft">
              <CountdownTimer endsAt={product.releaseAt} suffix="until release" endedLabel="Just released" />
            </div>
          )}
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{product.title}</h1>
          <p className="text-ink-soft">{product.tagline}</p>

          <Link href={`/@${creator.handle}`} className="flex items-center gap-2 text-sm">
            <CreatorAvatar name={creator.name} seed={creator.avatarSeed} avatarUrl={creator.avatar} size={24} />
            <span className="font-semibold text-ink hover:text-ink/80">By {creator.name}</span>
            {creator.verified && <BadgeCheck size={16} className="text-blue-500" aria-hidden />}
          </Link>

          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
            <StarRating rating={product.rating} />
            <span>({product.reviewCount})</span>
            <span>·</span>
            <span>{formatCompactNumber(product.sold)} sold</span>
            <span>·</span>
            <button
              onClick={() => toggleLike(product.id)}
              className={cn("flex items-center gap-1", liked && "text-red-500")}
            >
              <Heart size={16} className={cn(liked && "fill-red-500")} aria-hidden />
              {formatCompactNumber(product.likes + (liked ? 1 : 0))}
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-ink">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-ink-soft line-through">{formatPrice(product.originalPrice)}</span>
            )}
            {discount && (
              <span className="rounded-full bg-accent-50 px-2 py-1 text-xs font-bold text-accent-600">
                -{discount}%
              </span>
            )}
          </div>

          {confirmingPayment && (
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3 text-sm text-ink-soft">
              <Loader2 size={16} className="animate-spin" aria-hidden /> Confirming your payment…
            </div>
          )}
          {paymentConfirmTimedOut && (
            <p className="text-sm font-medium text-amber-600">
              Payment received — it&apos;s taking a moment to show up. Refresh in a bit if it doesn&apos;t appear.
            </p>
          )}

          <Button
            size="lg"
            className="w-full gap-1.5"
            onClick={() => setBuyOpen(true)}
            disabled={!released || (owned && !!product.sellerId)}
          >
            {!released ? (
              <>
                <Zap size={18} aria-hidden /> Releases Soon
              </>
            ) : owned ? (
              <>
                <CheckCircle2 size={18} aria-hidden /> {product.sellerId ? "Owned" : "Owned, Buy Again"}
              </>
            ) : (
              <>
                <ShoppingBag size={18} aria-hidden /> Buy Now
              </>
            )}
          </Button>

          {owned && product.productFilePath && (
            <>
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-1.5"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden /> Preparing…
                  </>
                ) : (
                  <>
                    <Download size={18} aria-hidden /> Download
                  </>
                )}
              </Button>
              {downloadError && <p className="text-sm font-medium text-red-600">{downloadError}</p>}
            </>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-1.5" onClick={() => toggleSave(product.id)}>
              <Bookmark size={16} className={cn(saved && "fill-current")} aria-hidden />
              {saved ? "Saved" : "Save"}
            </Button>
            <Button variant="outline" className="flex-1 gap-1.5" onClick={handleShare}>
              {copied ? (
                <>
                  <Check size={16} aria-hidden /> Copied!
                </>
              ) : (
                <>
                  <Share2 size={16} aria-hidden /> Share
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border pt-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <Zap size={14} aria-hidden /> Instant Download
            </span>
            <span className="flex items-center gap-1.5">
              <Lock size={14} aria-hidden /> Secure Payment
            </span>
            <span className="flex items-center gap-1.5">
              <Undo2 size={14} aria-hidden /> Money Back Guarantee
            </span>
          </div>
        </div>

        <div style={{ gridArea: "main" }}>
          <Tabs
            tabs={TABS.map((t) => ({
              ...t,
              label:
                t.id === "reviews"
                  ? `${t.label} (${reviewCount})`
                  : t.id === "comments"
                    ? `${t.label} (${commentCount})`
                    : t.label,
            }))}
            activeId={tab}
            onChange={setTab}
            className="border-b border-border pb-4"
          />

          <div className="pt-6">
            {tab === "overview" && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4 text-ink-soft">
                  {product.description.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <InfoBlock title="What's Included" items={product.whatsIncluded} />
                  <InfoBlock title="Compatible With" items={product.compatibleWith} />
                  <div>
                    <h3 className="mb-2 font-display text-sm font-bold text-ink">File Information</h3>
                    <dl className="space-y-1 text-sm text-ink-soft">
                      <div className="flex justify-between">
                        <dt>File Size</dt>
                        <dd className="font-medium text-ink">{product.fileSize}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>File Type</dt>
                        <dd className="font-medium text-ink">{product.fileTypes.join(", ")}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Last Updated</dt>
                        <dd className="font-medium text-ink">{product.lastUpdated}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="mb-2 font-display text-sm font-bold text-ink">Usage Rights</h3>
                    <p className="text-sm text-ink-soft">
                      {product.usageRights === "Commercial Use"
                        ? "This product is licensed for commercial use."
                        : "This product is licensed for personal use only."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tab === "reviews" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="flex flex-col items-center">
                    <span className="font-display text-4xl font-extrabold text-ink">{product.rating.toFixed(1)}</span>
                    <StarRating rating={product.rating} showValue={false} size="md" />
                    <span className="mt-1 text-xs text-ink-soft">{reviewCount} reviews</span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {breakdown.map((count, i) => {
                      const stars = 5 - i;
                      const pct = reviewCount ? Math.round((count / reviewCount) * 100) : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2 text-xs text-ink-soft">
                          <span className="w-3">{stars}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <ReviewForm productId={product.id} />

                <div className="flex flex-col gap-4">
                  {allReviews.length === 0 && (
                    <p className="text-sm text-ink-soft">No written reviews yet. Be the first to leave one.</p>
                  )}
                  {allReviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreatorAvatar name={review.author} seed={review.author} size={28} />
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              {review.author}
                              {review.verified && (
                                <span className="ml-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                                  Verified Purchase
                                </span>
                              )}
                            </p>
                            <span className="text-xs text-ink-soft">{review.date}</span>
                          </div>
                        </div>
                        <StarRating rating={review.rating} showValue={false} />
                      </div>
                      <p className="mt-2 text-sm text-ink-soft">{review.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "changelog" && (
              <ol className="flex flex-col gap-4">
                {CHANGELOG.map((entry) => (
                  <li key={entry.version} className="flex gap-4 rounded-2xl border border-border p-4">
                    <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink-soft">
                      {entry.version}
                    </span>
                    <div>
                      <p className="text-sm text-ink">{entry.note}</p>
                      <span className="text-xs text-ink-soft">{entry.date}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {tab === "comments" && <CommentsPanel targetId={product.id} />}
          </div>
        </div>

        <div style={{ gridArea: "side" }} className="flex flex-col gap-5">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
            <Link href={`/@${creator.handle}`} className="flex items-center gap-3">
              <CreatorAvatar name={creator.name} seed={creator.avatarSeed} avatarUrl={creator.avatar} size={48} />
              <div>
                <p className="flex items-center gap-1 font-display font-bold text-ink">
                  {creator.name}
                  {creator.verified && <BadgeCheck size={16} className="text-blue-500" aria-hidden />}
                </p>
                <p className="text-xs text-ink-soft">{creator.sellerTier}</p>
              </div>
            </Link>

            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
              <div>
                <p className="font-display font-bold text-ink">{formatCompactNumber(product.sold)}</p>
                <p className="text-[11px] text-ink-soft">Sales</p>
              </div>
              <div>
                <p className="font-display font-bold text-ink">{formatCompactNumber(creator.followers)}</p>
                <p className="text-[11px] text-ink-soft">Followers</p>
              </div>
              <div>
                <p className="font-display font-bold text-ink">{creator.positiveReviewPct}%</p>
                <p className="text-[11px] text-ink-soft">Positive</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link href={`/@${creator.handle}`} className="flex-1">
                <Button variant="secondary" className="w-full">
                  View Profile
                </Button>
              </Link>
              <Button
                variant={following ? "outline" : "primary"}
                className="flex-1"
                onClick={() => toggleFollow(creator.id)}
              >
                {following ? "Following" : "Follow"}
              </Button>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-soft">
              <MessageCircle size={14} aria-hidden /> Typically responds in {creator.responseTime}
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-ink">Ratings & Reviews</h3>
              <button onClick={() => setTab("reviews")} className="text-xs font-semibold text-primary-600">
                See all
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl font-extrabold text-ink">{product.rating.toFixed(1)}</span>
              <div>
                <StarRating rating={product.rating} showValue={false} />
                <p className="text-xs text-ink-soft">{reviewCount} reviews</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display mb-4 text-xl font-extrabold text-ink">You might also like</h2>
          <ProductGrid products={related} />
        </div>
      )}

      <BuyModal product={product} open={buyOpen} onClose={() => setBuyOpen(false)} />
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-sm font-bold text-ink">{title}</h3>
      <ul className="space-y-1.5 text-sm text-ink-soft">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check size={14} className="text-emerald-500" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
