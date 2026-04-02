import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveCredentials } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchProducts, fetchBrandMap, fetchCategoryMap, fetchVariantsForProduct } from "@/lib/bigcommerce/client";

// Batch size for parallel variant fetching — keeps BC API calls manageable
const VARIANT_CHUNK = 25;

/**
 * Map a raw BigCommerce variant to the ProductVariant format used in the app.
 * Falls back to basePrice when the variant has no independent price set.
 */
function mapVariant(
  v: {
    id: number;
    sku: string;
    price: number | null;
    option_values?: Array<{ label: string; option_display_name: string }>;
  },
  basePrice: number
): { id: string; name: string; sku?: string; price: number } {
  const name =
    v.option_values && v.option_values.length > 0
      ? v.option_values.map((ov) => ov.label).join(" / ")
      : v.sku || `Variant ${v.id}`;

  return {
    id: `bc_${v.id}`,
    name,
    sku: v.sku || undefined,
    price: v.price ?? basePrice,
  };
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;

  try {
    const body = await req.json();
    const resolved = await resolveCredentials(uid, body.credentials);
    if (resolved.error) return resolved.error;

    const products = await fetchProducts(resolved.config, {
      includeVariants: false,
    });
    const [brandMap, categoryMap] = await Promise.all([
      fetchBrandMap(resolved.config),
      fetchCategoryMap(resolved.config),
    ]);

    // -----------------------------------------------------------------------
    // Fetch variants for all products in parallel chunks to avoid BC rate limits
    // -----------------------------------------------------------------------
    const variantMap = new Map<number, ReturnType<typeof mapVariant>[]>();

    for (let i = 0; i < products.length; i += VARIANT_CHUNK) {
      const chunk = products.slice(i, i + VARIANT_CHUNK);
      await Promise.all(
        chunk.map(async (product) => {
          try {
            const bcVariants = await fetchVariantsForProduct(
              product.id,
              resolved.config
            );
            variantMap.set(
              product.id,
              bcVariants.map((v) => mapVariant(v, product.price ?? 0))
            );
          } catch {
            // If variant fetch fails for a product, store empty array
            variantMap.set(product.id, []);
          }
        })
      );
    }

    // -----------------------------------------------------------------------
    // Upsert products + variants into product_cache
    // -----------------------------------------------------------------------
    const supabase = createAdminClient();
    const CHUNK_SIZE = 500;

    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);

      const rows = chunk.map((product) => ({
        id: `${uid}_${product.id}`,
        user_id: uid,
        bigcommerce_product_id: product.id,
        name: product.name,
        sku: product.sku || "",
        price: product.price || 0,
        sale_price: product.sale_price || 0,
        cost_price: product.cost_price || 0,
        description: product.description || "",
        primary_image_url: product.primary_image?.url_standard || "",
        image_urls: (product.images || []).map((img) => img.url_standard),
        brand_name: brandMap[product.brand_id ?? 0] || "",
        categories: product.categories || [],
        category_names: (product.categories || [])
          .map((id) => categoryMap[id])
          .filter(Boolean),
        inventory_level: product.inventory_level || 0,
        is_visible: product.is_visible ?? true,
        availability: product.availability || "",
        weight: product.weight || 0,
        width: product.width || 0,
        height: product.height || 0,
        depth: product.depth || 0,
        custom_url: product.custom_url?.url || "",
        variants: variantMap.get(product.id) ?? [],
        synced_at: new Date().toISOString(),
        raw_data: product as unknown as Record<string, unknown>,
      }));

      await supabase
        .from("product_cache")
        .upsert(rows, { onConflict: "id" });
    }

    // Update profile sync metadata
    await supabase
      .from("profiles")
      .update({
        last_synced_at: new Date().toISOString(),
        product_count: products.length,
      })
      .eq("id", uid);

    return NextResponse.json({ status: "ok", synced: products.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("last_synced_at, product_count")
      .eq("id", uid)
      .single();

    return NextResponse.json({
      last_synced_at: data?.last_synced_at || null,
      product_count: data?.product_count || 0,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get sync status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
