import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/price-lists/[id] — fetch price list records as a SKU→price map
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;
  const { id } = await params;

  try {
    const supabase = createAdminClient();

    // Verify ownership
    const { data: pl, error: plError } = await supabase
      .from("price_lists")
      .select("id, name")
      .eq("id", id)
      .eq("user_id", uid)
      .single();

    if (plError || !pl) {
      return NextResponse.json({ error: "Price list not found" }, { status: 404 });
    }

    // Fetch all records
    const { data: records, error: recError } = await supabase
      .from("price_list_records")
      .select("sku, price")
      .eq("price_list_id", id);

    if (recError) throw recError;

    // Build SKU → price map
    const priceMap: Record<string, number> = {};
    for (const r of records ?? []) {
      priceMap[r.sku] = Number(r.price);
    }

    return NextResponse.json({ id: pl.id, name: pl.name, price_map: priceMap });
  } catch (err) {
    console.error("GET /api/price-lists/[id] error:", err);
    return NextResponse.json({ error: "Failed to load price list" }, { status: 500 });
  }
}

// DELETE /api/price-lists/[id] — delete a price list and its records
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;
  const { id } = await params;

  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("price_lists")
      .delete()
      .eq("id", id)
      .eq("user_id", uid);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/price-lists/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete price list" }, { status: 500 });
  }
}
