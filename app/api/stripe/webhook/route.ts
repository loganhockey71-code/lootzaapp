import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Two separate Stripe webhook endpoints point at this same route: one for
// the platform's own events, one for events on *connected* (seller) accounts
// — each configured in Stripe with its own signing secret. Which secret a
// request verifies against is what tells us which channel it came in on.
const platformWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

type WebhookChannel = "platform" | "connect";

const PLATFORM_EVENT_TYPES = new Set<Stripe.Event["type"]>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "charge.refunded",
]);
const CONNECT_EVENT_TYPES = new Set<Stripe.Event["type"]>(["account.updated"]);

/**
 * Verifies the request's signature against whichever of the two secrets it
 * actually matches, trying the platform secret first. Each attempt is a full,
 * real HMAC verification via stripe.webhooks.constructEvent — nothing here
 * weakens it; a payload only ever verifies against the one secret it was
 * genuinely signed with; Stripe applies bitwise/constant-time comparison and only
 * one of the two attempts can ever legitimately succeed for a given delivery.
 * Throws if neither secret is configured or neither verifies.
 */
function verifyStripeEvent(body: string, signature: string): { event: Stripe.Event; channel: WebhookChannel } {
  const stripe = getStripe();
  const failures: string[] = [];

  if (platformWebhookSecret) {
    try {
      return { event: stripe.webhooks.constructEvent(body, signature, platformWebhookSecret), channel: "platform" };
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (connectWebhookSecret) {
    try {
      return { event: stripe.webhooks.constructEvent(body, signature, connectWebhookSecret), channel: "connect" };
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(failures.join("; ") || "No Stripe webhook secret is configured.");
}

/**
 * The only place a `purchases` row for a real (Stripe-backed) product gets
 * created (or, for a repurchase after a refund, revived). Runs with the
 * service-role client since there's no signed-in user on a server-to-server
 * webhook call. seller_id/price are re-derived from the real product row by
 * the table's trigger on first insert — this only supplies buyer_id/product_id.
 *
 * Upsert rather than plain insert: (buyer_id, product_id) is unique, so a
 * buyer who was refunded and legitimately buys again would otherwise hit that
 * same constraint on the new purchase — silently discarding it as a
 * "duplicate" would mean they paid again but never got ownership back. The
 * upsert instead flips that existing row's status back to 'completed' and
 * points it at the new payment. On a genuinely new row, the trigger still
 * fills in seller_id/price as before; on the conflict path, only the columns
 * listed here change — price/seller_id from the original purchase are left
 * alone. A retried webhook delivery for the same session just re-applies the
 * same values, which is harmless.
 */
async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const buyerId = session.metadata?.buyer_id;
  const productId = session.metadata?.product_id;
  if (!buyerId || !productId) {
    console.error("Stripe webhook: checkout session missing buyer_id/product_id metadata", session.id);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  const { error } = await supabaseAdmin.from("purchases").upsert(
    {
      buyer_id: buyerId,
      product_id: productId,
      status: "completed",
      stripe_payment_intent_id: paymentIntentId ?? null,
    },
    { onConflict: "buyer_id,product_id" }
  );
  if (error) {
    console.error("Stripe webhook: failed to record purchase for session", session.id, error.message);
  }
}

/**
 * A Stripe-side refund (issued from the Stripe Dashboard or API) — marks the
 * matching purchases row 'refunded' so isOwned()/Collection/the download
 * route all stop treating it as owned. There's no in-app "issue a refund"
 * button; refunds are expected to be issued in Stripe directly, and this is
 * what syncs that back into Lootza's own ownership records.
 *
 * Only revokes on a FULL refund (charge.refunded is true only once the
 * entire amount is back) — a partial goodwill refund shouldn't take away
 * something the buyer mostly still paid for.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  if (!charge.refunded) return;

  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) {
    console.error("Stripe webhook: refunded charge has no payment_intent", charge.id);
    return;
  }

  const { error } = await supabaseAdmin
    .from("purchases")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntentId);
  if (error) {
    console.error("Stripe webhook: failed to mark purchase refunded for charge", charge.id, error.message);
  }
}

/**
 * Fires whenever a seller's Connect account changes — most importantly right
 * after they finish (or un-finish, e.g. a failed verification) onboarding.
 * This is the only place stripe_payouts_enabled gets flipped to true, which
 * is what app/api/checkout checks before allowing a real sale of that
 * seller's products.
 */
async function handleAccountUpdated(account: Stripe.Account) {
  const payoutsEnabled = !!account.charges_enabled && !!account.payouts_enabled;
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ stripe_payouts_enabled: payoutsEnabled })
    .eq("stripe_account_id", account.id);
  if (error) {
    console.error("Stripe webhook: failed to update payouts_enabled for account", account.id, error.message);
  }
}

export async function POST(request: NextRequest) {
  if (!platformWebhookSecret && !connectWebhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET / STRIPE_CONNECT_WEBHOOK_SECRET environment variables.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  let channel: WebhookChannel;
  try {
    ({ event, channel } = verifyStripeEvent(body, signature));
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Belt-and-suspenders: even though only a genuinely Stripe-signed payload
  // can verify against either secret at all, also confirm the event type
  // matches the channel it verified on — catches a Stripe endpoint
  // misconfigured to send the wrong event types down the wrong channel.
  const expectedChannel: WebhookChannel | null = CONNECT_EVENT_TYPES.has(event.type)
    ? "connect"
    : PLATFORM_EVENT_TYPES.has(event.type)
      ? "platform"
      : null;
  if (expectedChannel && expectedChannel !== channel) {
    console.error(
      `Stripe webhook: event ${event.type} (${event.id}) verified on the ${channel} channel, expected ${expectedChannel}`
    );
    return NextResponse.json({ error: "Event type does not match webhook channel." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Card payments are 'paid' immediately. Delayed payment methods complete
    // 'unpaid' here and fulfill later via checkout.session.async_payment_succeeded.
    if (session.payment_status === "paid") {
      await fulfillCheckoutSession(session);
    }
  } else if (event.type === "checkout.session.async_payment_succeeded") {
    await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
  } else if (event.type === "charge.refunded") {
    await handleChargeRefunded(event.data.object as Stripe.Charge);
  } else if (event.type === "account.updated") {
    await handleAccountUpdated(event.data.object as Stripe.Account);
  }

  return NextResponse.json({ received: true });
}
