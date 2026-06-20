import { createAdminClient } from "./supabase/server";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | "grandfathered";

export interface SubscriptionRecord {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: "monthly" | "yearly" | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  past_due_since: string | null;
}

const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Returns the user's subscription row, or null if none exists.
 */
export async function getSubscription(
  userId: string
): Promise<SubscriptionRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[subscription] fetch error", error);
    return null;
  }
  return (data as SubscriptionRecord | null) ?? null;
}

/**
 * Returns true if the user is currently entitled to access paid features.
 *
 * Entitlement rules:
 * - grandfathered → always true (existing users prior to paywall launch)
 * - active or trialing → true
 * - past_due → true for 3 days from past_due_since (grace period)
 * - everything else → false
 *
 * Admins should be checked separately by callers if they need to bypass.
 */
export function isEntitled(sub: SubscriptionRecord | null): boolean {
  if (!sub) return false;

  if (sub.status === "grandfathered") return true;
  if (sub.status === "active" || sub.status === "trialing") return true;

  if (sub.status === "past_due" && sub.past_due_since) {
    const since = new Date(sub.past_due_since).getTime();
    if (Date.now() - since < PAST_DUE_GRACE_MS) return true;
  }

  return false;
}

/**
 * Resolve the owner of the user's active organization. Falls back to the user
 * themselves if no membership exists. Entitlement is owner-gated: members ride
 * on their Owner's subscription.
 */
export async function getOrgOwnerId(userId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("organization_members")
    .select("org_role, organizations(owner_id)")
    .eq("user_id", userId);

  if (rows && rows.length > 0) {
    const sorted = [...rows].sort((a, b) =>
      a.org_role === "owner" ? -1 : b.org_role === "owner" ? 1 : 0
    );
    const orgRel = Array.isArray(sorted[0].organizations)
      ? sorted[0].organizations[0]
      : sorted[0].organizations;
    if (orgRel?.owner_id) return orgRel.owner_id as string;
  }

  return userId;
}

/**
 * Convenience: returns true if a user (by ID) currently has access.
 * Site admins always pass. Otherwise entitlement is owner-gated — the user has
 * access as long as their organization's Owner is entitled.
 */
export async function hasAccess(userId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "admin") return true;

  const ownerId = await getOrgOwnerId(userId);
  const sub = await getSubscription(ownerId);
  return isEntitled(sub);
}
