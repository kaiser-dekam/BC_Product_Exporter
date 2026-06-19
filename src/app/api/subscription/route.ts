import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/supabase/auth";
import { getSubscription, isEntitled } from "@/lib/subscription";
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

  const sub = await getSubscription(decoded.uid);
  const entitled = isAdmin || isEntitled(sub);

  return NextResponse.json({
    entitled,
    is_admin: isAdmin,
    status: sub?.status ?? null,
    plan: sub?.plan ?? null,
    current_period_end: sub?.current_period_end ?? null,
    trial_end: sub?.trial_end ?? null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
    has_stripe_customer: !!sub?.stripe_customer_id,
  });
}
