import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/supabase/auth";
import { resolveOrg } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

const DEFAULT_BOOK_PREFS = {
  show_price: true,
  show_sale_price: false,
  show_cost_price: false,
  show_variants: true,
};

export async function POST(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = await verifyAccessToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const { full_name, store_name, claude_system_prompt, book_preferences } = body;

  const supabase = createAdminClient();

  // Check if profile exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", decoded.uid)
    .single();

  if (!existing) {
    // Create new profile, then provision their organization.
    await supabase.from("profiles").insert({
      id: decoded.uid,
      email: decoded.email || "",
      full_name: full_name || "",
      store_name: store_name || "",
      role: "user",
    });
    await resolveOrg(decoded.uid); // provisions an org with this user as Owner
    return NextResponse.json({ status: "ok" });
  }

  // Personal fields live on the profile.
  const profileUpdates: Record<string, unknown> = {};
  if (full_name !== undefined) profileUpdates.full_name = full_name;
  if (Object.keys(profileUpdates).length > 0) {
    await supabase.from("profiles").update(profileUpdates).eq("id", decoded.uid);
  }

  // Shared settings live on the organization — Owner only.
  const orgUpdates: Record<string, unknown> = {};
  if (store_name !== undefined) orgUpdates.store_name = store_name;
  if (claude_system_prompt !== undefined)
    orgUpdates.claude_system_prompt = claude_system_prompt;
  if (book_preferences !== undefined) orgUpdates.book_preferences = book_preferences;

  if (Object.keys(orgUpdates).length > 0) {
    const resolved = await resolveOrg(decoded.uid);
    if (resolved.error) return resolved.error;
    if (resolved.org.orgRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: organization owner access required" },
        { status: 403 }
      );
    }
    await supabase
      .from("organizations")
      .update(orgUpdates)
      .eq("id", resolved.org.orgId);
  }

  return NextResponse.json({ status: "ok" });
}

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
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", decoded.uid)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Resolve the org for shared settings + this user's org role.
  const resolved = await resolveOrg(decoded.uid);
  if (resolved.error) return resolved.error;

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "store_name, bigcommerce_credentials, anthropic_api_key_encrypted, claude_system_prompt, csv_preferences, book_preferences"
    )
    .eq("id", resolved.org.orgId)
    .single();

  // Return profile without exposing encrypted credential values
  return NextResponse.json({
    uid: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
    org_id: resolved.org.orgId,
    org_role: resolved.org.orgRole,
    is_org_owner: resolved.org.orgRole === "owner",
    store_name: org?.store_name || "",
    has_bigcommerce_credentials: !!org?.bigcommerce_credentials,
    has_anthropic_key: !!org?.anthropic_api_key_encrypted,
    claude_system_prompt: org?.claude_system_prompt || null,
    csv_preferences: org?.csv_preferences ?? null,
    book_preferences:
      (org?.book_preferences as typeof DEFAULT_BOOK_PREFS | null) ??
      DEFAULT_BOOK_PREFS,
  });
}
