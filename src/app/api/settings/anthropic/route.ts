import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { encrypt } from "@/lib/crypto";

export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const { api_key } = await req.json();

  const profileRef = adminDb.collection("profiles").doc(auth.user.uid);

  if (!api_key) {
    await profileRef.update({
      anthropic_api_key_encrypted: null,
      anthropic_iv: null,
      anthropic_auth_tag: null,
      updated_at: FieldValue.serverTimestamp(),
    });
  } else {
    const encrypted = encrypt(api_key);
    await profileRef.update({
      anthropic_api_key_encrypted: encrypted.ciphertext,
      anthropic_iv: encrypted.iv,
      anthropic_auth_tag: encrypted.authTag,
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  return NextResponse.json({ status: "ok" });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const { api_key } = await req.json();

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (response.ok) {
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
  }
}
