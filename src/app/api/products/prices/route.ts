import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

interface PriceUpdate {
  id: string;
  price?: number;
  sale_price?: number;
  cost_price?: number;
}

export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

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

  const supabase = createAdminClient();
  let updated = 0;
  const errors: string[] = [];

  for (const item of updates) {
    const fields: Record<string, number> = {};

    if (item.price !== undefined) fields.price = item.price;
    if (item.sale_price !== undefined) fields.sale_price = item.sale_price;
    if (item.cost_price !== undefined) fields.cost_price = item.cost_price;

    if (Object.keys(fields).length === 0) continue;

    const { error } = await supabase
      .from("product_cache")
      .update(fields)
      .eq("id", item.id)
      .eq("user_id", uid);

    if (error) {
      errors.push(`${item.id}: ${error.message}`);
    } else {
      updated++;
    }
  }

  return NextResponse.json({ updated, errors });
}
