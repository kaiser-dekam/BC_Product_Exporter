import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";
import type { BigCommerceConfig } from "@/lib/bigcommerce/types";

/**
 * Shape of an encrypted BigCommerce credentials blob (per-field AES-GCM).
 * Used both by the profile and by additional inventory store sources.
 */
export interface EncryptedBigCommerceCredentials {
  store_hash_encrypted: string;
  store_hash_iv: string;
  store_hash_authTag: string;
  client_id_encrypted: string;
  client_id_iv: string;
  client_id_authTag: string;
  access_token_encrypted: string;
  access_token_iv: string;
  access_token_authTag: string;
}

/**
 * Encrypts a BigCommerce config into the stored per-field blob shape.
 */
export function encryptBigCommerceCredentials(
  config: BigCommerceConfig
): EncryptedBigCommerceCredentials {
  const storeHash = encrypt(config.store_hash);
  const clientId = encrypt(config.client_id);
  const accessToken = encrypt(config.access_token);

  return {
    store_hash_encrypted: storeHash.ciphertext,
    store_hash_iv: storeHash.iv,
    store_hash_authTag: storeHash.authTag,
    client_id_encrypted: clientId.ciphertext,
    client_id_iv: clientId.iv,
    client_id_authTag: clientId.authTag,
    access_token_encrypted: accessToken.ciphertext,
    access_token_iv: accessToken.iv,
    access_token_authTag: accessToken.authTag,
  };
}

/**
 * Decrypts a stored credentials blob into a usable config. Falls back to the
 * legacy shared `iv`/`authTag` fields when per-field ones are absent. Throws
 * if the blob can't be decrypted.
 */
export function decryptBigCommerceCredentials(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creds: any
): BigCommerceConfig {
  return {
    store_hash: decrypt({
      ciphertext: creds.store_hash_encrypted,
      iv: creds.store_hash_iv || creds.iv,
      authTag: creds.store_hash_authTag || creds.authTag,
    }),
    client_id: decrypt({
      ciphertext: creds.client_id_encrypted,
      iv: creds.client_id_iv || creds.iv,
      authTag: creds.client_id_authTag || creds.authTag,
    }),
    access_token: decrypt({
      ciphertext: creds.access_token_encrypted,
      iv: creds.access_token_iv || creds.iv,
      authTag: creds.access_token_authTag || creds.authTag,
    }),
  };
}

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

// ---------------------------------------------------------------------------
// Organization helpers
// ---------------------------------------------------------------------------

export type OrgRole = "owner" | "editor";

export interface OrgContext {
  orgId: string;
  ownerId: string;
  orgRole: OrgRole;
}

/**
 * Resolve the user's active organization. If they belong to several, an org
 * they own is preferred. If they belong to none (e.g. a freshly created
 * account), one is provisioned with them as Owner so the app never lands a
 * logged-in user without a workspace.
 */
export async function resolveOrg(
  uid: string
): Promise<
  | { org: OrgContext; error?: never }
  | { org?: never; error: NextResponse }
> {
  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("organization_members")
    .select("org_id, org_role, organizations(owner_id)")
    .eq("user_id", uid);

  if (rows && rows.length > 0) {
    // Prefer an org the user owns.
    const sorted = [...rows].sort((a, b) =>
      a.org_role === "owner" ? -1 : b.org_role === "owner" ? 1 : 0
    );
    const row = sorted[0];
    // Supabase types the embedded relation as an array; normalize.
    const orgRel = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;
    return {
      org: {
        orgId: row.org_id as string,
        ownerId: (orgRel?.owner_id as string) ?? uid,
        orgRole: row.org_role as OrgRole,
      },
    };
  }

  // No membership — provision a personal org for this user.
  const provisioned = await ensureOrgForUser(uid);
  if (!provisioned) {
    return {
      error: NextResponse.json(
        { error: "No organization for user" },
        { status: 404 }
      ),
    };
  }
  return { org: provisioned };
}

/**
 * Create an organization owned by the given user if they don't already have a
 * membership. Returns the resulting OrgContext, or null on failure. Settings
 * (BigCommerce creds, Anthropic key, prefs) are copied off the profile so a
 * pre-existing single-user setup carries over.
 */
export async function ensureOrgForUser(
  uid: string
): Promise<OrgContext | null> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("organization_members")
    .select("org_id, org_role, organizations(owner_id)")
    .eq("user_id", uid)
    .limit(1);

  if (existing && existing.length > 0) {
    const row = existing[0];
    const orgRel = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;
    return {
      orgId: row.org_id as string,
      ownerId: (orgRel?.owner_id as string) ?? uid,
      orgRole: row.org_role as OrgRole,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "email, store_name, full_name, bigcommerce_credentials, anthropic_api_key_encrypted, anthropic_iv, anthropic_auth_tag, claude_system_prompt, csv_preferences, book_preferences, last_synced_at, product_count"
    )
    .eq("id", uid)
    .maybeSingle();

  // If this user was invited to an org, join it rather than creating their own.
  if (profile?.email) {
    const { data: invite } = await supabase
      .from("organization_invites")
      .select("id, org_id, org_role, organizations(owner_id)")
      .ilike("email", profile.email)
      .limit(1)
      .maybeSingle();

    if (invite) {
      await supabase
        .from("organization_members")
        .insert({
          org_id: invite.org_id,
          user_id: uid,
          org_role: invite.org_role,
        });
      await supabase.from("organization_invites").delete().eq("id", invite.id);

      const inviteOrgRel = Array.isArray(invite.organizations)
        ? invite.organizations[0]
        : invite.organizations;
      return {
        orgId: invite.org_id as string,
        ownerId: (inviteOrgRel?.owner_id as string) ?? uid,
        orgRole: invite.org_role as OrgRole,
      };
    }
  }

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name:
        profile?.store_name || profile?.full_name || "My Organization",
      owner_id: uid,
      bigcommerce_credentials: profile?.bigcommerce_credentials ?? null,
      anthropic_api_key_encrypted: profile?.anthropic_api_key_encrypted ?? null,
      anthropic_iv: profile?.anthropic_iv ?? null,
      anthropic_auth_tag: profile?.anthropic_auth_tag ?? null,
      claude_system_prompt: profile?.claude_system_prompt ?? null,
      csv_preferences: profile?.csv_preferences ?? null,
      ...(profile?.book_preferences
        ? { book_preferences: profile.book_preferences }
        : {}),
      store_name: profile?.store_name ?? "",
      last_synced_at: profile?.last_synced_at ?? null,
      product_count: profile?.product_count ?? 0,
    })
    .select("id, owner_id")
    .single();

  if (orgErr || !org) return null;

  await supabase
    .from("organization_members")
    .insert({ org_id: org.id, user_id: uid, org_role: "owner" });

  return { orgId: org.id as string, ownerId: uid, orgRole: "owner" };
}

/**
 * Require that the user is an Owner of their active organization.
 * Returns the OrgContext or a 403 error.
 */
export async function requireOrgOwner(
  uid: string
): Promise<
  | { org: OrgContext; error?: never }
  | { org?: never; error: NextResponse }
> {
  const resolved = await resolveOrg(uid);
  if (resolved.error) return { error: resolved.error };

  if (resolved.org.orgRole !== "owner") {
    return {
      error: NextResponse.json(
        { error: "Forbidden: organization owner access required" },
        { status: 403 }
      ),
    };
  }

  return { org: resolved.org };
}

/**
 * Load and decrypt the organization's shared BigCommerce credentials.
 * Returns the config or a NextResponse error.
 */
export async function loadCredentialsFromProfile(
  uid: string
): Promise<
  | { config: BigCommerceConfig; error?: never }
  | { config?: never; error: NextResponse }
> {
  const resolved = await resolveOrg(uid);
  if (resolved.error) return { error: resolved.error };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("bigcommerce_credentials")
    .eq("id", resolved.org.orgId)
    .single();

  if (error || !data) {
    return {
      error: NextResponse.json(
        { error: "Organization not found" },
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
    return { config: decryptBigCommerceCredentials(creds) };
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
 * Resolve BigCommerce credentials from either the request body or the user's
 * organization. If `credentials` is provided in the body, use it directly.
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
