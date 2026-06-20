import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireOrgOwner } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// DELETE /api/organization/invites/[inviteId] — cancel a pending invite (Owner only).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const { inviteId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const owner = await requireOrgOwner(auth.user.uid);
  if (owner.error) return owner.error;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organization_invites")
    .delete()
    .eq("id", inviteId)
    .eq("org_id", owner.org.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
