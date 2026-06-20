import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireOrgOwner } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// PATCH /api/organization/members/[userId] — change a member's role (Owner only).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const owner = await requireOrgOwner(auth.user.uid);
  if (owner.error) return owner.error;
  const { orgId, ownerId } = owner.org;

  const body = await req.json().catch(() => null);
  const orgRole = body?.org_role === "owner" ? "owner" : body?.org_role === "editor" ? "editor" : null;
  if (!orgRole) {
    return NextResponse.json({ error: "org_role must be 'owner' or 'editor'" }, { status: 400 });
  }

  // The founding owner's role can't be changed (protects against orphaning the org).
  if (userId === ownerId) {
    return NextResponse.json(
      { error: "The organization owner's role cannot be changed" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organization_members")
    .update({ org_role: orgRole })
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}

// DELETE /api/organization/members/[userId] — remove a member (Owner only).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const owner = await requireOrgOwner(auth.user.uid);
  if (owner.error) return owner.error;
  const { orgId, ownerId } = owner.org;

  // The founding owner can't be removed.
  if (userId === ownerId) {
    return NextResponse.json(
      { error: "The organization owner cannot be removed" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
