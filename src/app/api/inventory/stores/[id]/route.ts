import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// DELETE /api/inventory/stores/[id] — remove an additional BigCommerce store
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("inventory_stores")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.uid);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
