import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import type { BigCommerceConfig } from "@/lib/bigcommerce/types";

/**
 * Authenticate a request by extracting and verifying the Bearer token.
 * Returns the decoded user info or a 401 NextResponse.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<
  | { user: { uid: string; email: string | undefined }; error?: never }
  | { user?: never; error: NextResponse }
> {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const decoded = await verifyAccessToken(token);
  if (!decoded) {
    return {
      error: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }

  return { user: decoded };
}

/**
 * Load and decrypt BigCommerce credentials from the user's profile.
 * Returns the config or a NextResponse error.
 */
export async function loadCredentialsFromProfile(
  uid: string
): Promise<
  | { config: BigCommerceConfig; error?: never }
  | { config?: never; error: NextResponse }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("bigcommerce_credentials")
    .eq("id", uid)
    .single();

  if (error || !data) {
    return {
      error: NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      ),
    };
  }

  const creds = data.bigcommerce_credentials;

  if (!creds) {
    return {
      error: NextResponse.json(
        { error: "BigCommerce credentials not configured" },
        { status: 400 }
      ),
    };
  }

  try {
    const store_hash = decrypt({
      ciphertext: creds.store_hash_encrypted,
      iv: creds.store_hash_iv || creds.iv,
      authTag: creds.store_hash_authTag || creds.authTag,
    });
    const client_id = decrypt({
      ciphertext: creds.client_id_encrypted,
      iv: creds.client_id_iv || creds.iv,
      authTag: creds.client_id_authTag || creds.authTag,
    });
    const access_token = decrypt({
      ciphertext: creds.access_token_encrypted,
      iv: creds.access_token_iv || creds.iv,
      authTag: creds.access_token_authTag || creds.authTag,
    });

    return { config: { store_hash, client_id, access_token } };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Failed to decrypt credentials" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Resolve BigCommerce credentials from either the request body or the user's profile.
 * If `credentials` is provided in the body, use it directly. Otherwise, load from DB.
 */
export async function resolveCredentials(
  uid: string,
  credentials?: { store_hash: string; client_id: string; access_token: string }
): Promise<
  | { config: BigCommerceConfig; error?: never }
  | { config?: never; error: NextResponse }
> {
  if (credentials) {
    const { store_hash, client_id, access_token } = credentials;
    if (!store_hash || !client_id || !access_token) {
      return {
        error: NextResponse.json(
          { error: "Incomplete credentials provided" },
          { status: 400 }
        ),
      };
    }
    return { config: { store_hash, client_id, access_token } };
  }

  return loadCredentialsFromProfile(uid);
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

/**
 * Check if the user has admin role. Returns ok:true or a 403 error.
 */
export async function requireAdmin(
  uid: string
): Promise<
  | { ok: true; error?: never }
  | { ok?: never; error: NextResponse }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .single();

  if (error || !data) {
    return {
      error: NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      ),
    };
  }

  if (data.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Forbidden: admin access required" },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Site-wide settings
// ---------------------------------------------------------------------------

const DEFAULT_SITE_SETTINGS = {
  default_claude_model: "claude-sonnet-4-20250514",
};

/**
 * Load site-wide settings from the database.
 * Returns sensible defaults if no settings row exists yet.
 */
export async function getSiteSettings(): Promise<{
  default_claude_model: string;
}> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("default_claude_model")
    .eq("id", "global")
    .single();

  if (error || !data) {
    return DEFAULT_SITE_SETTINGS;
  }

  return {
    default_claude_model:
      data.default_claude_model || DEFAULT_SITE_SETTINGS.default_claude_model,
  };
}
