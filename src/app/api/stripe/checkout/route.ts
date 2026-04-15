import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getStripe, getPriceId, getAppUrl } from "@/lib/stripe/server";

const TRIAL_DAYS = 14;

export async function POST(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const decoded = await verifyAccessToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = body.plan as "monthly" | "yearly" | undefined;
  if (plan !== "monthly" && plan !== "yearly") {
    return NextResponse.json(
      { error: "plan must be 'monthly' or 'yearly'" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const supabase = createAdminClient();

  // Look up existing subscription row to reuse the Stripe customer if present.
  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id, status")
    .eq("user_id", decoded.uid)
    .maybeSingle();

  // If they're already entitled (active/trialing/grandfathered), don't create
  // a new checkout. Send them to the portal instead via the client.
  if (
    existingSub &&
    ["active", "trialing", "grandfathered"].includes(existingSub.status)
  ) {
    return NextResponse.json(
      { error: "Already subscribed" },
      { status: 400 }
    );
  }

  let customerId = existingSub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: decoded.email,
      metadata: { supabase_user_id: decoded.uid },
    });
    customerId = customer.id;

    // Persist the customer ID immediately so we don't create duplicates
    // if checkout is abandoned.
    await supabase.from("user_subscriptions").upsert(
      {
        user_id: decoded.uid,
        stripe_customer_id: customerId,
        status: "incomplete",
      },
      { onConflict: "user_id" }
    );
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getPriceId(plan), quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { supabase_user_id: decoded.uid, plan },
    },
    metadata: { supabase_user_id: decoded.uid, plan },
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
