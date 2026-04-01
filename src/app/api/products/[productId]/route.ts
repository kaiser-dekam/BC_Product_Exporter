import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAccessibleUserIds } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;
  const email = auth.user.email;

  try {
    const supabase = createAdminClient();
    const accessibleIds = await getAccessibleUserIds(uid, email);

    const { data, error } = await supabase
      .from("product_cache")
      .select("*")
      .eq("id", productId)
      .in("user_id", accessibleIds)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Return all fields except raw_data (the full BigCommerce JSON blob)
    const { raw_data: _raw, ...rest } = data;

    return NextResponse.json(rest);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
