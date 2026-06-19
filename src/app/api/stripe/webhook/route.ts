import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/server";

// Stripe needs the raw body for signature verification — never parse as JSON.
export const runtime = "nodejs";

function planFromPriceId(priceId: string | null | undefined): "monthly" | "yearly" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return "yearly";
  return null;
}

async function upsertFromSubscription(sub: Stripe.Subscription) {
  const supabase = createAdminClient();
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Resolve user_id from customer metadata or by stripe_customer_id lookup.
  let userId =
    (sub.metadata?.supabase_user_id as string | undefined) || null;

  if (!userId) {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }

  if (!userId) {
    // Last resort: pull from the customer object metadata.
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      userId = (customer.metadata?.supabase_user_id as string | undefined) ?? null;
    }
  }

  if (!userId) {
    console.error(
      "[stripe webhook] could not resolve user_id for customer",
      customerId
    );
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const plan = planFromPriceId(priceId);

  // Stripe sends current_period_end as a unix timestamp (seconds).
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;
  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;

  // Track when past_due began so we can grant the 3-day grace period.
  // If the subscription transitions back to active, clear it.
  let pastDueSince: string | null = null;
  if (sub.status === "past_due") {
    const { data: existing } = await supabase
      .from("user_subscriptions")
      .select("status, past_due_since")
      .eq("user_id", userId)
      .maybeSingle();
    pastDueSince =
      existing?.status === "past_due" && existing.past_due_since
        ? existing.past_due_since
        : new Date().toISOString();
  }

  await supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      plan,
      status: sub.status,
      current_period_end: currentPeriodEnd,
      trial_end: trialEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      past_due_since: pastDueSince,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe webhook] signature verification failed:", msg);
    return NextResponse.json({ error: `Invalid signature: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_failed": {
        // Subscription updates usually fire alongside this, but ensure
        // past_due_since is set in case the status flip arrives separately.
        const invoice = event.data.object as Stripe.Invoice;
        // Stripe types: invoice.subscription is on the parent line item context
        // but we read it via the parent property when present.
        const subId =
          (invoice as unknown as { subscription?: string | Stripe.Subscription })
            .subscription;
        if (subId) {
          const id = typeof subId === "string" ? subId : subId.id;
          const sub = await stripe.subscriptions.retrieve(id);
          await upsertFromSubscription(sub);
        }
        break;
      }
      default:
        // Ignore unrelated events.
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
