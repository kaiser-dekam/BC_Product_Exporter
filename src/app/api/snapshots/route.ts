import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAccessibleUserIds } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

const CHUNK_SIZE = 500;

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;
  const email = auth.user.email;

  try {
    const supabase = createAdminClient();
    const accessibleIds = await getAccessibleUserIds(uid, email);

    // Fetch all products (only the fields we need)
    const { data: products, error: fetchError } = await supabase
      .from("product_cache")
      .select("id, name, sku, price, sale_price, cost_price, description")
      .in("user_id", accessibleIds)
      .order("name", { ascending: true });

    if (fetchError) throw fetchError;

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "No products to backup" },
        { status: 400 }
      );
    }

    // Create snapshot record
    const label = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const { data: snapshot, error: snapshotError } = await supabase
      .from("product_snapshots")
      .insert({
        user_id: uid,
        label,
        product_count: products.length,
      })
      .select("id, label, product_count, created_at")
      .single();

    if (snapshotError) throw snapshotError;

    // Batch-insert snapshot items
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      const rows = chunk.map((p) => ({
        snapshot_id: snapshot.id,
        product_id: p.id,
        name: p.name || "",
        sku: p.sku || "",
        price: p.price || 0,
        sale_price: p.sale_price || 0,
        cost_price: p.cost_price || 0,
        description: p.description || "",
      }));

      const { error: insertError } = await supabase
        .from("product_snapshot_items")
        .insert(rows);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create backup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("product_snapshots")
      .select("id, label, product_count, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ snapshots: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch backups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
