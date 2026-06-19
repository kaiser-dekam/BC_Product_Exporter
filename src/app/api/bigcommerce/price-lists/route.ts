import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveCredentials } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchPriceLists, fetchPriceListRecords } from "@/lib/bigcommerce/client";

/**
 * POST /api/bigcommerce/price-lists
 * Syncs all active BigCommerce Price Lists into the price_lists and
 * price_list_records tables. Uses bigcommerce_id to upsert, so repeated
 * syncs update rather than duplicate. Manually imported (CSV) price lists
 * — those with bigcommerce_id IS NULL — are left untouched.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;

  try {
    const body = await req.json().catch(() => ({}));
    const resolved = await resolveCredentials(uid, body.credentials);
    if (resolved.error) return resolved.error;

    const supabase = createAdminClient();

    // 1. Fetch all price lists from BigCommerce
    const bcLists = await fetchPriceLists(resolved.config);

    if (bcLists.length === 0) {
      return NextResponse.json({ synced: 0, message: "No price lists found in BigCommerce." });
    }

    let synced = 0;

    for (const bcList of bcLists) {
      // 2. Upsert the price list row (match by user_id + bigcommerce_id)
      const { data: pl, error: plError } = await supabase
        .from("price_lists")
        .upsert(
          { user_id: uid, name: bcList.name, bigcommerce_id: bcList.id },
          { onConflict: "user_id,bigcommerce_id" }
        )
        .select("id")
        .single();

      if (plError || !pl) {
        console.error(`Failed to upsert price list "${bcList.name}":`, plError);
        continue;
      }

      // 3. Delete old records for this price list and re-insert fresh ones
      await supabase
        .from("price_list_records")
        .delete()
        .eq("price_list_id", pl.id);

      // 4. Fetch records from BigCommerce
      const bcRecords = await fetchPriceListRecords(bcList.id, resolved.config);

      // 5. Only keep records that have a SKU and a price
      const validRecords = bcRecords.filter(
        (r) => r.sku && r.sku.trim() && r.price != null
      );

      if (validRecords.length > 0) {
        // Insert in chunks of 500
        const CHUNK = 500;
        for (let i = 0; i < validRecords.length; i += CHUNK) {
          const chunk = validRecords.slice(i, i + CHUNK).map((r) => ({
            price_list_id: pl.id,
            sku: r.sku.trim(),
            price: r.price as number,
          }));

          const { error: recError } = await supabase
            .from("price_list_records")
            .insert(chunk);

          if (recError) {
            console.error(`Failed to insert records for "${bcList.name}":`, recError);
          }
        }
      }

      synced++;
    }

    return NextResponse.json({
      synced,
      total: bcLists.length,
      message: `Synced ${synced} price list${synced !== 1 ? "s" : ""} from BigCommerce.`,
    });
  } catch (err) {
    console.error("POST /api/bigcommerce/price-lists error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
