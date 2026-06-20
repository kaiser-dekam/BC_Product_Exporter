import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveOrg } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// DELETE /api/tags/[tagId] — delete a tag and all its assignments (via CASCADE)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const { tagId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("product_tags")
    .delete()
    .eq("id", tagId)
    .eq("organization_id", orgResolved.org.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
