import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveOrg } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/tags — returns all tags and all assignments for the organization
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;
  const { orgId } = orgResolved.org;
  const supabase = createAdminClient();

  const [tagsResult, assignmentsResult] = await Promise.all([
    supabase
      .from("product_tags")
      .select("id, name, color")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("product_tag_assignments")
      .select("product_id, tag_id")
      .eq("organization_id", orgId),
  ]);

  if (tagsResult.error) {
    return NextResponse.json({ error: tagsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    tags: tagsResult.data || [],
    assignments: assignmentsResult.data || [],
  });
}

// POST /api/tags — create a new tag
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const color = body?.color?.trim() || "#3b82f6";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_tags")
    .insert({ user_id: auth.user.uid, organization_id: orgResolved.org.orgId, name, color })
    .select("id, name, color")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A tag with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag: data }, { status: 201 });
}
