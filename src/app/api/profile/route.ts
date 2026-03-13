import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";

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
  const { full_name, store_name, claude_system_prompt, collaborator_emails } = body;

  const supabase = createAdminClient();

  // Check if profile exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", decoded.uid)
    .single();

  if (existing) {
    // Update existing profile
    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (store_name !== undefined) updates.store_name = store_name;
    if (claude_system_prompt !== undefined)
      updates.claude_system_prompt = claude_system_prompt;
    if (collaborator_emails !== undefined)
      updates.collaborator_emails = collaborator_emails;

    await supabase.from("profiles").update(updates).eq("id", decoded.uid);
  } else {
    // Create new profile
    await supabase.from("profiles").insert({
      id: decoded.uid,
      email: decoded.email || "",
      full_name: full_name || "",
      store_name: store_name || "",
      role: "user",
    });
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
    .select(
      "id, email, full_name, store_name, role, bigcommerce_credentials, anthropic_api_key_encrypted, claude_system_prompt, csv_preferences, collaborator_emails"
    )
    .eq("id", decoded.uid)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Return profile without exposing encrypted credential values
  return NextResponse.json({
    uid: data.id,
    email: data.email,
    full_name: data.full_name,
    store_name: data.store_name,
    role: data.role,
    has_bigcommerce_credentials: !!data.bigcommerce_credentials,
    has_anthropic_key: !!data.anthropic_api_key_encrypted,
    claude_system_prompt: data.claude_system_prompt || null,
    csv_preferences: data.csv_preferences,
    collaborator_emails: (data.collaborator_emails as string[]) || [],
  });
}
