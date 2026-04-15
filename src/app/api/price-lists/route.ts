import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/price-lists — list all price lists with record counts
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const supabase = createAdminClient();

    // Fetch price lists
    const { data, error } = await supabase
      .from("price_lists")
      .select("id, name, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch record counts per price list
    const priceLists = await Promise.all(
      (data || []).map(async (pl) => {
        const { count } = await supabase
          .from("price_list_records")
          .select("*", { count: "exact", head: true })
          .eq("price_list_id", pl.id);

        return {
          id: pl.id,
          name: pl.name,
          created_at: pl.created_at,
          record_count: count ?? 0,
        };
      })
    );

    return NextResponse.json({ price_lists: priceLists });
  } catch (err) {
    console.error("GET /api/price-lists error:", err);
    return NextResponse.json({ error: "Failed to load price lists" }, { status: 500 });
  }
}

// POST /api/price-lists — create a new price list with records
// Body: { name: string, records: Array<{ sku: string, price: number }> }
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const body = await req.json();
    const { name, records } = body as {
      name: string;
      records: Array<{ sku: string; price: number }>;
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "Records array is required and must not be empty" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Create the price list
    const { data: pl, error: plError } = await supabase
      .from("price_lists")
      .insert({ user_id: uid, name: name.trim() })
      .select("id, name, created_at")
      .single();

    if (plError || !pl) throw plError ?? new Error("Failed to create price list");

    // Insert records in chunks to avoid payload limits
    const CHUNK = 500;
    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK).map((r) => ({
        price_list_id: pl.id,
        sku: String(r.sku).trim(),
        price: Number(r.price),
      }));

      const { error: recError } = await supabase
        .from("price_list_records")
        .insert(chunk);

      if (recError) throw recError;
    }

    return NextResponse.json({
      price_list: {
        id: pl.id,
        name: pl.name,
        created_at: pl.created_at,
        record_count: records.length,
      },
    });
  } catch (err) {
    console.error("POST /api/price-lists error:", err);
    return NextResponse.json({ error: "Failed to create price list" }, { status: 500 });
  }
}
