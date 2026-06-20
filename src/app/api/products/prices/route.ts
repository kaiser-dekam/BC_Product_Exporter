import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, loadCredentialsFromProfile, resolveOrg } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { updateProductPrice, findProductIdBySku } from "@/lib/bigcommerce/client";

interface PriceUpdate {
  id: string; // product_cache composite id: {org_owner_id}_{bc_product_id}
  price?: number;
  sale_price?: number;
  cost_price?: number;
}

export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;
  const orgResolved = await resolveOrg(uid);
  if (orgResolved.error) return orgResolved.error;
  const { orgId } = orgResolved.org;

  let body: { updates: PriceUpdate[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { updates } = body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { error: "updates must be a non-empty array" },
      { status: 400 }
    );
  }

  if (updates.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 updates per request" },
      { status: 400 }
    );
  }

  // Load BigCommerce credentials
  const creds = await loadCredentialsFromProfile(uid);
  if (creds.error) return creds.error;

  const supabase = createAdminClient();

  // Fetch bigcommerce_product_id, sku, and name for each cache entry
  const cacheIds = updates.map((u) => u.id);
  const { data: rows, error: fetchError } = await supabase
    .from("product_cache")
    .select("id, bigcommerce_product_id, name, sku")
    .in("id", cacheIds)
    .eq("organization_id", orgId);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Map cache id → { bcId, name, sku }
  const infoMap = new Map<string, { bcId: number; name: string; sku: string }>(
    (rows ?? []).map((r) => [
      r.id,
      { bcId: r.bigcommerce_product_id, name: r.name, sku: r.sku ?? "" },
    ])
  );

  type ItemResult = { id: string; name: string; bcError: string | null; healedBcId?: number };

  // Push each update to BigCommerce individually (parallel).
  // On 404, attempt a SKU-based fallback lookup to handle stale cached IDs.
  const bcResults = await Promise.all(
    updates.map(async (item): Promise<ItemResult> => {
      const info = infoMap.get(item.id);
      if (!info) {
        return { id: item.id, name: "Unknown", bcError: "Product not found in local cache" };
      }

      const priceFields = {
        ...(item.price !== undefined && { price: item.price }),
        ...(item.sale_price !== undefined && { sale_price: item.sale_price }),
        ...(item.cost_price !== undefined && { cost_price: item.cost_price }),
      };

      // First attempt with the cached BC product ID
      const firstResult = await updateProductPrice(
        { id: info.bcId, ...priceFields },
        creds.config,
      );

      if (!firstResult.notFound) {
        return { id: item.id, name: info.name, bcError: firstResult.error };
      }

      // Cached ID returned 404 — try to find the real ID via SKU
      if (!info.sku) {
        return {
          id: item.id,
          name: info.name,
          bcError: `Cached BC ID ${info.bcId} not found and no SKU available to look up the product`,
        };
      }

      const realBcId = await findProductIdBySku(info.sku, creds.config);
      if (!realBcId) {
        return {
          id: item.id,
          name: info.name,
          bcError: `Cached BC ID ${info.bcId} not found; SKU "${info.sku}" also not found in BigCommerce`,
        };
      }

      // Retry with the real ID
      const retryResult = await updateProductPrice(
        { id: realBcId, ...priceFields },
        creds.config,
      );

      return {
        id: item.id,
        name: info.name,
        bcError: retryResult.error,
        healedBcId: retryResult.error === null ? realBcId : undefined,
      };
    })
  );

  const succeeded = bcResults.filter((r) => r.bcError === null);
  const failed = bcResults.filter((r) => r.bcError !== null);

  const succeededIds = new Set(succeeded.map((r) => r.id));
  const cacheErrors: string[] = [];

  await Promise.all(
    updates
      .filter((item) => succeededIds.has(item.id))
      .map(async (item) => {
        const result = bcResults.find((r) => r.id === item.id)!;
        const fields: Record<string, number> = {};
        if (item.price !== undefined) fields.price = item.price;
        if (item.sale_price !== undefined) fields.sale_price = item.sale_price;
        if (item.cost_price !== undefined) fields.cost_price = item.cost_price;
        // Heal the stale BC product ID if the SKU fallback found a new one
        if (result.healedBcId !== undefined) {
          fields.bigcommerce_product_id = result.healedBcId;
        }
        if (Object.keys(fields).length === 0) return;

        const { error } = await supabase
          .from("product_cache")
          .update(fields)
          .eq("id", item.id)
          .eq("organization_id", orgId);

        if (error) cacheErrors.push(`${item.id}: ${error.message}`);
      })
  );

  const errors = [
    ...failed.map((r) => `"${r.name}": ${r.bcError}`),
    ...cacheErrors,
  ];

  return NextResponse.json({ updated: succeeded.length, errors });
}
