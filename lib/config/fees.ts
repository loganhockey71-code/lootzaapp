/**
 * Lootza's cut of every real (Stripe-backed) sale. Applied as a Stripe
 * `application_fee_amount` on the destination charge in app/api/checkout —
 * the remainder transfers to the seller's connected account. Does not apply
 * to the seed/mock catalog, which never touches Stripe.
 */
export const PLATFORM_FEE_PERCENT = 10;

/** Same value in basis points (100 bps = 1%) — the unit Stripe fee math uses. */
export const PLATFORM_FEE_BPS = PLATFORM_FEE_PERCENT * 100;
