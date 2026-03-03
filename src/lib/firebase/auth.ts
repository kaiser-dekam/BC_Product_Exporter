import { adminAuth } from "./admin";

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded UID or null if invalid.
 */
export async function verifyIdToken(
  idToken: string
): Promise<{ uid: string; email: string | undefined } | null> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
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
