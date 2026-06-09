import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  encryptBigCommerceCredentials,
  decryptBigCommerceCredentials,
} from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchInventoryItems } from "@/lib/bigcommerce/client";
import { normalizeSku } from "@/lib/google-sheets";
import type { BigCommerceConfig } from "@/lib/bigcommerce/types";

export const dynamic = "force-dynamic";

interface StoreRow {
  id: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credentials: any;
  sku_prefix: string;
  sort_order: number;
}

// GET /api/inventory/stores
// Returns each additional BigCommerce store plus its current inventory as a
// SKU -> total available-to-sell map (summed across that store's locations).
// Credentials are never returned. A failing store is reported per-store via an
// `error` field rather than failing the whole request.
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data: stores, error } = await supabase
    .from("inventory_stores")
    .select("id, name, credentials, sku_prefix, sort_order")
    .eq("user_id", auth.user.uid)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.all(
    (stores ?? []).map(async (store: StoreRow) => {
      const base = {
        id: store.id,
        name: store.name,
        sku_prefix: store.sku_prefix,
      };
      try {
        const config = decryptBigCommerceCredentials(store.credentials);
        const items = await fetchInventoryItems(config);

        const data: Record<string, number> = {};
        for (const item of items) {
          const rawSku = item.identity?.sku;
          if (!rawSku) continue;
          const sku = normalizeSku(String(rawSku), store.sku_prefix);
          if (!sku) continue;
          const total = (item.locations ?? []).reduce(
            (sum, loc) => sum + (loc.available_to_sell ?? 0),
            0,
          );
          data[sku] = total;
        }

        return {
          ...base,
          data,
          item_count: Object.keys(data).length,
          error: null as string | null,
        };
      } catch (err) {
        return {
          ...base,
          data: {} as Record<string, number>,
          item_count: 0,
          error: err instanceof Error ? err.message : "Failed to read store",
        };
      }
    }),
  );

  return NextResponse.json({ stores: results });
}

// POST /api/inventory/stores — add another BigCommerce store
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const store_hash = body?.store_hash?.trim();
  const client_id = body?.client_id?.trim();
  const access_token = body?.access_token?.trim();
  const sku_prefix = body?.sku_prefix?.trim() || "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!store_hash || !client_id || !access_token) {
    return NextResponse.json(
      { error: "store_hash, client_id and access_token are all required" },
      { status: 400 },
    );
  }

  const config: BigCommerceConfig = { store_hash, client_id, access_token };

  // Validate the credentials against BigCommerce before saving.
  try {
    const res = await fetch(
      `https://api.bigcommerce.com/stores/${store_hash}/v3/catalog/products?limit=1`,
      {
        method: "GET",
        headers: {
          "X-Auth-Token": access_token,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Could not connect to BigCommerce (${res.status}): ${text}` },
        { status: 400 },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("inventory_stores")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.uid);

  const { data, error } = await supabase
    .from("inventory_stores")
    .insert({
      user_id: auth.user.uid,
      name,
      credentials: encryptBigCommerceCredentials(config),
      sku_prefix,
      sort_order: count ?? 0,
    })
    .select("id, name, sku_prefix, sort_order")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ store: data }, { status: 201 });
}
