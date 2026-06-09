import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  loadCredentialsFromProfile,
  getAccessibleUserIds,
} from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchInventoryLocations,
  fetchInventoryItems,
  fetchInventoryTrackingMap,
} from "@/lib/bigcommerce/client";

export const dynamic = "force-dynamic";

interface InventoryRow {
  sku: string;
  product_id: number | null;
  variant_id: number | null;
  name: string;
  primary_image_url: string;
  /** location_id -> available_to_sell */
  locations: Record<number, number>;
  total: number;
  /** "none" | "product" | "variant" — catalog inventory_tracking setting */
  inventory_tracking: string;
  /** true when tracking is at product or variant level (i.e. not "none") */
  tracked: boolean;
}

// GET /api/bigcommerce/inventory
// Returns the configured inventory locations and a per-SKU breakdown of the
// available-to-sell count at each location, joined with product names from the
// local product_cache.
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;
  const email = auth.user.email;

  const creds = await loadCredentialsFromProfile(uid);
  if (creds.error) return creds.error;

  try {
    const [locations, items, trackingMap] = await Promise.all([
      fetchInventoryLocations(creds.config),
      fetchInventoryItems(creds.config),
      fetchInventoryTrackingMap(creds.config),
    ]);

    // Build a SKU -> { name, image } map from the local product cache so the
    // table can show recognizable product names. Joined by SKU (case-insensitive).
    const supabase = createAdminClient();
    const accessibleIds = await getAccessibleUserIds(uid, email);
    const { data: cacheRows } = await supabase
      .from("product_cache")
      .select("sku, name, primary_image_url")
      .in("user_id", accessibleIds);

    const nameBySku = new Map<string, { name: string; image: string }>();
    for (const row of cacheRows ?? []) {
      if (!row.sku) continue;
      nameBySku.set(String(row.sku).toUpperCase(), {
        name: row.name ?? "",
        image: row.primary_image_url ?? "",
      });
    }

    const rows: InventoryRow[] = items
      .filter((item) => item.identity?.sku)
      .map((item) => {
        const sku = String(item.identity.sku).toUpperCase();
        const locationCounts: Record<number, number> = {};
        let total = 0;

        for (const loc of item.locations ?? []) {
          const count = loc.available_to_sell ?? 0;
          locationCounts[loc.location_id] = count;
          total += count;
        }

        const cached = nameBySku.get(sku);

        const productId = item.identity.product_id ?? null;
        // Default to "product" when the product_id isn't in the catalog map so
        // we don't accidentally hide real items; only an explicit "none" is
        // treated as tracking-off.
        const inventoryTracking =
          productId != null && trackingMap[productId] !== undefined
            ? trackingMap[productId]
            : "product";

        return {
          sku,
          product_id: productId,
          variant_id: item.identity.variant_id ?? null,
          name: cached?.name ?? "",
          primary_image_url: cached?.image ?? "",
          locations: locationCounts,
          total,
          inventory_tracking: inventoryTracking,
          tracked: inventoryTracking === "product" || inventoryTracking === "variant",
        };
      });

    return NextResponse.json({
      locations: locations.map((l) => ({
        id: l.id,
        code: l.code,
        label: l.label,
        enabled: l.enabled,
      })),
      items: rows,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch inventory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
