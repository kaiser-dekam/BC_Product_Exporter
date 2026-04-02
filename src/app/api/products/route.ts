import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAccessibleUserIds } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// Fields for list view (excludes raw_data, description, image_urls, categories, category_names)
const LIST_FIELDS =
  "id, user_id, bigcommerce_product_id, name, sku, price, sale_price, cost_price, primary_image_url, brand_name, inventory_level, is_visible, availability, weight, width, height, depth, custom_url, claude_summary, claude_specs, claude_weight_dims, claude_model_used, summarized_at, synced_at, category_names";

// Minimal fields for ProductPicker modal
const PICKER_FIELDS =
  "id, user_id, name, sku, price, sale_price, cost_price, primary_image_url, brand_name, claude_summary, variants, category_names";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;
  const email = auth.user.email;
  const { searchParams } = new URL(req.url);

  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 50, 1),
    200
  );
  const offset = Number(searchParams.get("offset")) || 0;
  const cursor = searchParams.get("cursor") || "";
  const mode = searchParams.get("mode") || "";

  const fields = mode === "picker" ? PICKER_FIELDS : LIST_FIELDS;

  try {
    const supabase = createAdminClient();

    // Include products from collaborator accounts
    const accessibleIds = await getAccessibleUserIds(uid, email);

    // Use offset-based pagination (cursor converted to offset for backward compat)
    const effectiveOffset = cursor ? Number(cursor) || 0 : offset;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products, error, count } = await (supabase
      .from("product_cache")
      .select(fields as any, { count: "exact" })
      .in("user_id", accessibleIds)
      .order("name", { ascending: true })
      .range(effectiveOffset, effectiveOffset + limit - 1));

    if (error) throw error;

    const total = count ?? 0;
    const nextCursor =
      effectiveOffset + limit < total
        ? String(effectiveOffset + limit)
        : null;

    return NextResponse.json({
      products: products || [],
      total,
      next_cursor: nextCursor,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
