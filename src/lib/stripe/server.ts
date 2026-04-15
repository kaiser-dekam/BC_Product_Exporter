import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Server-side Stripe client. Singleton.
 * Throws if STRIPE_SECRET_KEY is not set.
 */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY env var");
  }

  // Use the library's default API version (matches the installed SDK).
  stripeClient = new Stripe(key, { typescript: true });

  return stripeClient;
}

export function getPriceId(plan: "monthly" | "yearly"): string {
  const id =
    plan === "monthly"
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY;
  if (!id) {
    throw new Error(
      `Missing STRIPE_PRICE_${plan.toUpperCase()} env var`
    );
  }
  return id;
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
}
