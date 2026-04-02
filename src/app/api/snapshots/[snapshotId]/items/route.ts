import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const { snapshotId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;

  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 25, 1), 100);
  const search = searchParams.get("search") || "";

  try {
    const supabase = createAdminClient();

    // Verify snapshot belongs to user
    const { data: snapshot, error: snapError } = await supabase
      .from("product_snapshots")
      .select("id")
      .eq("id", snapshotId)
      .eq("user_id", uid)
      .single();

    if (snapError || !snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from("product_snapshot_items")
      .select("id, product_id, name, sku, price, sale_price, cost_price, description", { count: "exact" })
      .eq("snapshot_id", snapshotId)
      .order("name", { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: items, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      items: items || [],
      total,
      page,
      totalPages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch snapshot items";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
