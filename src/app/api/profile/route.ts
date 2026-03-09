import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, extractBearerToken } from "@/lib/firebase/auth";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const { full_name, store_name, claude_system_prompt } = body;

  const profileRef = adminDb.collection("profiles").doc(decoded.uid);
  const existing = await profileRef.get();

  if (existing.exists) {
    // Update existing profile
    const updates: Record<string, unknown> = { updated_at: FieldValue.serverTimestamp() };
    if (full_name !== undefined) updates.full_name = full_name;
    if (store_name !== undefined) updates.store_name = store_name;
    if (claude_system_prompt !== undefined) updates.claude_system_prompt = claude_system_prompt;
    await profileRef.update(updates);
  } else {
    // Create new profile, check for legacy credentials migration
    let legacyCreds = null;
    const legacyRef = adminDb.collection("user_credentials").doc(decoded.uid);
    const legacyDoc = await legacyRef.get();
    if (legacyDoc.exists) {
      legacyCreds = legacyDoc.data();
    }

    await profileRef.set({
      uid: decoded.uid,
      email: decoded.email || "",
      full_name: full_name || "",
      store_name: store_name || "",
      role: "user",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      bigcommerce_credentials: null,
      anthropic_api_key_encrypted: null,
      anthropic_iv: null,
      anthropic_auth_tag: null,
      claude_system_prompt: null,
      csv_preferences: null,
      // Store legacy creds reference for migration in settings page
      _legacy_creds: legacyCreds || null,
    });
  }

  return NextResponse.json({ status: "ok" });
}

export async function GET(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const profileRef = adminDb.collection("profiles").doc(decoded.uid);
  const doc = await profileRef.get();

  if (!doc.exists) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const data = doc.data()!;
  // Return profile without exposing encrypted credential values
  return NextResponse.json({
    uid: data.uid,
    email: data.email,
    full_name: data.full_name,
    store_name: data.store_name,
    role: data.role,
    has_bigcommerce_credentials: !!data.bigcommerce_credentials,
    has_anthropic_key: !!data.anthropic_api_key_encrypted,
    claude_system_prompt: data.claude_system_prompt || null,
    csv_preferences: data.csv_preferences,
  });
}
