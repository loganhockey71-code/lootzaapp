import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Two separate Stripe webhook endpoints point at this same route: one for
// the platform's own (Checkout/Charge) events, one for events on *connected*
// (seller) accounts. These are no longer the same verification mechanism —
// the platform channel is still classic v1 events (full payload, verified
// via stripe.webhooks.constructEvent); the connect channel is Accounts v2
// "thin events" (payload only references what changed, verified via
// stripe.parseEventNotification and requiring a follow-up fetch for the
// actual data) — see handleRecipientCapabilityChange below.
const platformWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

// Accounts v2 event types for the "recipient" configuration (transfers/
// payouts) changing — confirmed against the installed SDK's known event
// list (node_modules/stripe/cjs/StripeEventNotificationHandler.js). Both are
// handled identically: re-fetch the account's current capability status
// rather than trust anything in the thin payload itself. Checked with an
// inline `===` chain on `notification.type` (below) rather than a helper
// function, so TypeScript's discriminated-union narrowing actually applies
// to `notification` itself — a narrowing check factored into a separate
// function only narrows the value passed in, not the original object.

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
 *
 * products.sold is incremented separately, and only once per genuine
 * completion (first purchase, or a repurchase after a refund) — never on a
 * retried delivery of a completion already recorded, which the upsert above
 * would otherwise silently repeat every time Stripe redelivers the event.
 */
async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const buyerId = session.metadata?.buyer_id;
  const productId = session.metadata?.product_id;
  if (!buyerId || !productId) {
    console.error("Stripe webhook: checkout session missing buyer_id/product_id metadata", session.id);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  const { data: existing } = await supabaseAdmin
    .from("purchases")
    .select("status")
    .eq("buyer_id", buyerId)
    .eq("product_id", productId)
    .maybeSingle();
  const alreadyCompleted = existing?.status === "completed";

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
    return;
  }

  if (!alreadyCompleted) {
    const { error: incError } = await supabaseAdmin.rpc("increment_product_sold", { p_product_id: productId });
    if (incError) {
      console.error("Stripe webhook: failed to increment sold count for product", productId, incError.message);
    }
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
 * Fires whenever a seller's Connect account's recipient (transfers/payouts)
 * configuration changes — most importantly right after they finish (or
 * un-finish, e.g. a failed verification) onboarding. This is the only place
 * stripe_payouts_enabled gets flipped to true, which is what
 * app/api/checkout checks before allowing a real sale of that seller's
 * products.
 *
 * Accounts v2 webhooks are "thin events" — the payload only says *that*
 * something changed, not what the new state is — so this always re-fetches
 * the account's current capability status rather than trusting anything in
 * the event payload itself.
 *
 * Checks both `stripe_transfers` (can receive money from the platform) and
 * `payouts` (can actually get that money out to their bank) — the v1
 * equivalent checked both `charges_enabled` and `payouts_enabled` for the
 * same reason: a seller isn't really "paid" until both are true.
 */
async function handleRecipientCapabilityChange(accountId: string) {
  const stripe = getStripe();
  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient"],
  });
  const capabilities = account.configuration?.recipient?.capabilities?.stripe_balance;
  const payoutsEnabled = capabilities?.stripe_transfers?.status === "active" && capabilities?.payouts?.status === "active";

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ stripe_payouts_enabled: payoutsEnabled })
    .eq("stripe_account_id", accountId);
  if (error) {
    console.error("Stripe webhook: failed to update payouts_enabled for account", accountId, error.message);
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

  const stripe = getStripe();

  // Try the platform channel first: classic v1 events, full payload, a
  // single real HMAC verification via stripe.webhooks.constructEvent. A
  // payload only ever verifies against the secret it was genuinely signed
  // with, so this can't be spoofed by trying the other channel instead.
  if (platformWebhookSecret) {
    let event: Stripe.Event | null = null;
    try {
      event = stripe.webhooks.constructEvent(body, signature, platformWebhookSecret);
    } catch (err) {
      if (!connectWebhookSecret) {
        console.error("Stripe webhook signature verification failed:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
      }
    }
    if (event) {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        // Card payments are 'paid' immediately. Delayed payment methods
        // complete 'unpaid' here and fulfill later via
        // checkout.session.async_payment_succeeded.
        if (session.payment_status === "paid") {
          await fulfillCheckoutSession(session);
        }
      } else if (event.type === "checkout.session.async_payment_succeeded") {
        await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
      } else if (event.type === "charge.refunded") {
        await handleChargeRefunded(event.data.object as Stripe.Charge);
      }
      return NextResponse.json({ received: true });
    }
  }

  // Fall through to the connect channel: Accounts v2 thin events, verified
  // and parsed via a different SDK method entirely (not interchangeable
  // with constructEvent above — a v1-style payload can't parse as a v2 thin
  // event and vice versa, so there's no ambiguity about which channel a
  // given delivery actually belongs to).
  if (connectWebhookSecret) {
    try {
      const notification = stripe.parseEventNotification(body, signature, connectWebhookSecret);
      if (
        notification.type === "v2.core.account[configuration.recipient].updated" ||
        notification.type === "v2.core.account[configuration.recipient].capability_status_updated"
      ) {
        const accountId = notification.related_object?.id;
        if (accountId) await handleRecipientCapabilityChange(accountId);
      }
      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
}
