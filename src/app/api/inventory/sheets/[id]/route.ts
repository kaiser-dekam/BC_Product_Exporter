import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireOrgOwner } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// DELETE /api/inventory/sheets/[id] — remove a configured Google Sheet source (Owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const owner = await requireOrgOwner(auth.user.uid);
  if (owner.error) return owner.error;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("inventory_sheets")
    .delete()
    .eq("id", id)
    .eq("organization_id", owner.org.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
