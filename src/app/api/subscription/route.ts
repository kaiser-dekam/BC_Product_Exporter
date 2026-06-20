import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/supabase/auth";
import { getSubscription, isEntitled, getOrgOwnerId } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const decoded = await verifyAccessToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", decoded.uid)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  // Entitlement is owner-gated: members ride on their Owner's subscription.
  const ownerId = await getOrgOwnerId(decoded.uid);
  const isOrgOwner = ownerId === decoded.uid;
  const sub = await getSubscription(ownerId);
  const entitled = isAdmin || isEntitled(sub);

  return NextResponse.json({
    entitled,
    is_admin: isAdmin,
    is_org_owner: isOrgOwner,
    status: sub?.status ?? null,
    plan: sub?.plan ?? null,
    current_period_end: sub?.current_period_end ?? null,
    trial_end: sub?.trial_end ?? null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
    // Only the Owner manages billing, so only expose the Stripe customer to them.
    has_stripe_customer: isOrgOwner && !!sub?.stripe_customer_id,
  });
}
