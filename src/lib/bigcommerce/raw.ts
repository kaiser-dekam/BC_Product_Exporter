import type { BigCommerceConfig } from "./types";

/**
 * Thin wrapper around the BigCommerce v3 REST API. Returns the parsed JSON
 * payload along with the HTTP status so callers can mirror upstream errors.
 */
export async function bcRaw<T = unknown>(
  config: BigCommerceConfig,
  method: "GET" | "PUT" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const url = `https://api.bigcommerce.com/stores/${config.store_hash}/v3${path}`;
  const headers: Record<string, string> = {
    "X-Auth-Client": config.client_id,
    "X-Auth-Token": config.access_token,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }
  return { status: res.status, data: data as T };
}
