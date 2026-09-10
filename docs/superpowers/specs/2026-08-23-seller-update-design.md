# Lootza Seller Update — Design

Date: 2026-08-23

## Goal

Update the seller ("Drop a new product") flow and the Wallet page with:

1. A product cover image upload (upload/preview/replace/remove).
2. Six Lootza Coin purchase packages, up to $99.99, with better value at higher tiers.
3. Optional Limited Quantity ("N available", buyers see remaining count).
4. Optional Scheduled Release (release date/time + pre-release countdown).
5. File Types and Compatible With kept, made explicitly optional, switched to a tag/chip UI.
6. Regular License / Extended License replaced with Usage Rights: Personal Use / Commercial Use.

Constraints: match existing design system and component patterns, reuse existing components where possible, no decorative emojis (lucide icons only), don't break existing functionality, keep the basic listing flow simple — advanced options are opt-in.

This is a frontend-only prototype (no backend): all new "purchases" (coins, products) remain simulated the same way existing purchases already are, and all seller-entered data is persisted to `localStorage` via `AppStateContext`, exactly like today.

## A) Sell form — cover image, chip inputs, Usage Rights

### Cover image

`Product.coverImage: string | null` already exists and `ProductArtwork` already renders it (falling back to generated category art when null) — **no type change needed**.

New component `components/sell/ImageUploadZone.tsx`, modeled on the existing `FileUploadZone` (same drag/drop + click-to-browse shell, same border/hover treatment) but rendering an actual `<img>` thumbnail preview instead of a generic file icon, with:
- Upload (empty state, same as `FileUploadZone`'s dropzone)
- Preview (shows the image)
- Replace (re-opens file picker)
- Remove (clears back to empty state)

The selected `File` is converted to a data URL via `FileReader.readAsDataURL` so it round-trips through `localStorage` like the rest of the demo's state. Wired into Step 1 ("File") of `app/sell/product/page.tsx`, alongside the existing product-file upload. `FormState` gains `coverImage: string | null`, and `handleDrop()` sets `product.coverImage` from it (instead of always `null`). The Step 4 "Review" preview already renders through `ProductArtwork`, so it automatically shows the real image once set.

### File Types / Compatible With → chips

No type change (`fileTypes: string[]`, `compatibleWith: string[]` stay as-is — already legal as empty arrays, so they're already optional in practice).

UI change only: the Details step's two comma-separated `<input>`s are replaced with the same "text input + Enter/Add button to add a chip, × to remove" pattern already used for "What's Included" in the same step. Field hints updated to say "(optional)".

### Usage Rights replaces License

`Product.license: string` → `Product.usageRights: "Personal Use" | "Commercial Use"`.

- `lib/types.ts`: rename/retype the field.
- `app/sell/product/page.tsx`: the Pricing step's two-button selector keeps its exact current styling, values become `"Personal Use" | "Commercial Use"`; `FormState.license` → `FormState.usageRights`.
- `components/product/BuyModal.tsx`: the "Regular License · Instant download" line becomes "`{product.usageRights} · Instant download`".
- `app/product/[slug]/ProductDetailClient.tsx`: the "License" info block is renamed "Usage Rights"; body text becomes "This product comes with a {usage rights label} license." with copy adjusted per value (e.g. "...for personal use." / "...for commercial use.").
- `lib/data/products.ts`: migrate all 18 seed products — the 17 currently `"Regular License"` → `"Personal Use"`, the 1 `"Extended License"` → `"Commercial Use"`.

No other files reference `.license` (confirmed via search).

## B) Limited Quantity & Scheduled Release

New, independent optional fields on `Product` in `lib/types.ts`:

```ts
/** Optional seller-set cap. Remaining is fixed at listing time — not decremented on purchase (no backend to track real stock in this prototype), matching how the existing `drop.quantityRemaining` already behaves as static data. */
limitedQuantity?: { total: number; remaining: number };

/** Optional ISO datetime. Before this moment the listing shows a countdown and can't be bought; after, it behaves like a normal listing. */
releaseAt?: string | null;
```

These are **not** merged into the existing `drop?: DropInfo` field. `drop` is reserved for hand-curated marketplace campaigns shown on `/drops` with red "Limited Drop"/"Event Drop" badges; letting any seller's ordinary listing render with that same treatment would make it look like an official Lootza event. The new fields get their own, calmer visual treatment.

### Seller flow

In the Pricing step of `app/sell/product/page.tsx`, below Usage Rights, two off-by-default toggle rows:
- "Limit how many are available" → reveals a number input ("e.g. 100"); on submit, `limitedQuantity = { total, remaining: total }`.
- "Schedule a release" → reveals a `datetime-local` input; on submit, `releaseAt` = that value as ISO.

Both stay collapsed/untouched for a basic listing, so the default flow is unchanged.

### Buyer-side display

`ProductCard.tsx` and `ProductDetailClient.tsx` both gain, alongside the existing `product.drop` block:

- If `limitedQuantity`: a quiet row — "`{remaining} of {total} left`" with a thin progress bar in primary/ink tones (not red), placed near the price/availability area.
- If `releaseAt` is in the future: a "Releasing in Xd HH:MM:SS" countdown (reusing `CountdownTimer`, which already polls every second — no new timer logic needed) and the Buy button is disabled and reads "Releases soon" instead of "Buy Now" (`ProductDetailClient`) / the card's "View Drop" CTA stays but the detail page is where purchase is actually blocked. The listing remains visible in Discover/category feeds throughout — nothing is hidden pre-release. Once `releaseAt` has passed, everything renders as a normal listing automatically, re-checked on each timer tick the same way `CountdownTimer` already flips to "ended" state.

Small helper `isReleased(product)` in `lib/utils.ts` (`!product.releaseAt || new Date(product.releaseAt) <= new Date()`), used by both components to gate the Buy button and choose which state to render.

## C) Lootza Coin purchase packages

New section "Get Lootza Coins" on `app/wallet/page.tsx`, placed immediately after the existing Coins/Level stat cards, before "Recent activity".

Data lives in a new `lib/data/coinPackages.ts`:

```ts
export interface CoinPackage {
  id: string;
  price: number;   // USD
  coins: number;
  bonusLabel?: string; // e.g. "+15% bonus", "Best Value"
}

export const coinPackages: CoinPackage[] = [
  { id: "coins-1.99",  price: 1.99,  coins: 200 },
  { id: "coins-4.99",  price: 4.99,  coins: 550 },
  { id: "coins-9.99",  price: 9.99,  coins: 1150, bonusLabel: "+15% bonus" },
  { id: "coins-24.99", price: 24.99, coins: 3000, bonusLabel: "+20% bonus" },
  { id: "coins-49.99", price: 49.99, coins: 6500, bonusLabel: "+30% bonus" },
  { id: "coins-99.99", price: 99.99, coins: 14000, bonusLabel: "Best Value" },
];
```

UI: a responsive grid of package cards (same card shell as the existing cosmetics grid: `rounded-2xl border border-border bg-surface p-4 shadow-card`), each showing the coin amount (Coins icon), the bonus tag if present (reusing `Badge`'s `neutral`/`success` tone styling), and price with a "Buy" button.

Clicking Buy opens a confirm `Modal` (new small component or inline in `WalletPage`, following `BuyModal`'s exact copy pattern): package summary, price, "This is a frontend demo — no payment provider is connected. Clicking confirm just adds these coins to your balance locally." → "Confirm Purchase" button.

State: new `purchaseCoins(packageId: string): AuthResult` action in `AppStateContext.tsx`, same shape as `simulateReferral`, calling `grantCoins(next, pkg.coins, "coin-purchase", \`Bought ${pkg.coins.toLocaleString()} coins ($${pkg.price.toFixed(2)})\`)`.

`lib/types.ts`: `CoinReason` union gains `"coin-purchase"`.

## Files touched

- `lib/types.ts` — `usageRights`, `limitedQuantity`, `releaseAt`, `CoinReason` addition.
- `lib/utils.ts` — `isReleased()` helper.
- `lib/data/products.ts` — migrate `license` → `usageRights` on all 18 seed products.
- `lib/data/coinPackages.ts` — new.
- `lib/state/AppStateContext.tsx` — `purchaseCoins` action.
- `components/sell/ImageUploadZone.tsx` — new.
- `app/sell/product/page.tsx` — cover image field, chip inputs, Usage Rights selector, Limited Quantity / Scheduled Release toggles, review step updates.
- `components/product/ProductCard.tsx` — limited quantity row, release countdown state.
- `app/product/[slug]/ProductDetailClient.tsx` — same, plus Buy button gating and Usage Rights label rename.
- `components/product/BuyModal.tsx` — Usage Rights label.
- `app/wallet/page.tsx` — Get Lootza Coins section + confirm modal.

## Out of scope

- Any real payment integration (stays simulated, matching existing `BuyModal`/`simulateReferral` behavior).
- Decrementing `limitedQuantity.remaining` on purchase (no backend/multi-user stock tracking in this prototype).
- Changes to the existing curated `drop`/`/drops` page system.
- Auto-hiding scheduled/pre-release listings from feeds.
