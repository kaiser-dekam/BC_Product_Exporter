import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// PUT /api/products/[productId]/tags — replace the full tag set for a product
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const tagIds: string[] = Array.isArray(body?.tag_ids) ? body.tag_ids : [];

  const uid = auth.user.uid;
  const supabase = createAdminClient();

  // Replace all assignments in one transaction: delete then insert
  const { error: deleteError } = await supabase
    .from("product_tag_assignments")
    .delete()
    .eq("product_id", productId)
    .eq("user_id", uid);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ product_id: productId, tag_id, user_id: uid }));
    const { error: insertError } = await supabase
      .from("product_tag_assignments")
      .insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
