import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSiteSettings } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { decrypt } from "@/lib/crypto";

const DEFAULT_SYSTEM_PROMPT = `You are a product catalog specialist. Given product information, create a concise, professional summary suitable for a printed sales book.

Format your response as exactly 5 or 6 bullet points using a dash prefix ("- "). Each bullet must be under 90 characters. Focus on key features, specifications, dimensions, materials, and selling points. Do not include a heading or intro text — only the bullet points.

Example format:
- Heavy-duty steel construction with powder-coated matte black finish
- Supports up to 500 lbs with reinforced corner brackets
- Dimensions: 48" W x 24" D x 36" H, ships fully assembled`;

function buildUserMessage(product: Record<string, unknown>): string {
  return `Product: ${product.name ?? ""}
SKU: ${product.sku ?? ""}
Price: $${product.price ?? ""}
Brand: ${product.brand_name ?? ""}
Description: ${product.description ?? ""}
Weight: ${product.weight ?? ""} lbs
Dimensions: ${product.width ?? ""} x ${product.height ?? ""} x ${product.depth ?? ""} in`;
}

async function loadAnthropicApiKey(uid: string): Promise<string | null> {
  const profileDoc = await adminDb.collection("profiles").doc(uid).get();
  if (!profileDoc.exists) return null;

  const data = profileDoc.data()!;

  if (
    data.anthropic_api_key_encrypted &&
    data.anthropic_iv &&
    data.anthropic_auth_tag
  ) {
    try {
      return decrypt({
        ciphertext: data.anthropic_api_key_encrypted,
        iv: data.anthropic_iv,
        authTag: data.anthropic_auth_tag,
      });
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  let body: { product_ids?: string[]; system_prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { product_ids, system_prompt } = body;

  if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
    return NextResponse.json(
      { error: "product_ids must be a non-empty array" },
      { status: 400 }
    );
  }

  // Resolve the Anthropic API key
  let apiKey = await loadAnthropicApiKey(uid);
  if (!apiKey) {
    apiKey = process.env.ANTHROPIC_API_KEY ?? null;
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Anthropic API key configured. Add one in Settings or set the ANTHROPIC_API_KEY environment variable." },
      { status: 400 }
    );
  }

  // Resolve the system prompt
  let systemPrompt = system_prompt || null;
  if (!systemPrompt) {
    const profileDoc = await adminDb.collection("profiles").doc(uid).get();
    if (profileDoc.exists) {
      const profileData = profileDoc.data()!;
      systemPrompt = profileData.claude_system_prompt || null;
    }
  }
  if (!systemPrompt) {
    systemPrompt = DEFAULT_SYSTEM_PROMPT;
  }

  // Load site-wide model setting
  const siteSettings = await getSiteSettings();
  const claudeModel = siteSettings.default_claude_model;

  const errors: string[] = [];
  let summarized = 0;

  // Process products sequentially to avoid rate limits
  for (const productId of product_ids) {
    try {
      const productRef = adminDb.collection("product_cache").doc(productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        errors.push(`Product ${productId} not found`);
        continue;
      }

      const productData = productDoc.data()!;

      if (productData.user_id !== uid) {
        errors.push(`Product ${productId} does not belong to this user`);
        continue;
      }

      const userMessage = buildUserMessage(productData);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: claudeModel,
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        errors.push(
          `Failed to summarize product ${productId}: ${response.status} ${errorBody}`
        );
        continue;
      }

      const result = await response.json();
      const summaryText: string = result.content[0].text;

      await productRef.update({
        claude_summary: summaryText,
        claude_model_used: claudeModel,
        summarized_at: FieldValue.serverTimestamp(),
      });

      summarized++;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      errors.push(`Error processing product ${productId}: ${message}`);
    }
  }

  return NextResponse.json({ status: "ok", summarized, errors });
}
