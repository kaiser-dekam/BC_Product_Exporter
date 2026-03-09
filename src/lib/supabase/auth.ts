import { createAdminClient } from "./server";

/**
 * Verify a Supabase access token (JWT from Authorization header).
 * Returns the decoded UID and email, or null if invalid.
 */
export async function verifyAccessToken(
  accessToken: string
): Promise<{ uid: string; email: string | undefined } | null> {
  try {
    const supabase = createAdminClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) return null;

    return { uid: user.id, email: user.email };
  } catch {
    return null;
  }
}

/**
 * Extract the Bearer token from an Authorization header value.
 */
export function extractBearerToken(
  authHeader: string | null
): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
