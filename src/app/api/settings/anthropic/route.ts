import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSiteSettings } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const { api_key } = await req.json();

  const supabase = createAdminClient();

  if (!api_key) {
    await supabase
      .from("profiles")
      .update({
        anthropic_api_key_encrypted: null,
        anthropic_iv: null,
        anthropic_auth_tag: null,
      })
      .eq("id", auth.user.uid);
  } else {
    const encrypted = encrypt(api_key);
    await supabase
      .from("profiles")
      .update({
        anthropic_api_key_encrypted: encrypted.ciphertext,
        anthropic_iv: encrypted.iv,
        anthropic_auth_tag: encrypted.authTag,
      })
      .eq("id", auth.user.uid);
  }

  return NextResponse.json({ status: "ok" });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const { api_key } = await req.json();

  // Use site-wide model setting for test call
  const siteSettings = await getSiteSettings();
  const claudeModel = siteSettings.default_claude_model;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: claudeModel,
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
