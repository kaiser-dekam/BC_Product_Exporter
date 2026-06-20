import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveOrg } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const { productId } = await params;

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("description_drafts")
    .select("description,name,sku,updated_at")
    .eq("organization_id", orgResolved.org.orgId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No draft" }, { status: 404 });

  return NextResponse.json({
    description: data.description || "",
    name: data.name || "",
    sku: data.sku || "",
    updatedAt: data.updated_at,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const { productId } = await params;

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;

  let body: { description?: unknown; name?: unknown; sku?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.description !== "string") {
    return NextResponse.json({ error: "description must be a string" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("description_drafts")
    .upsert({
      user_id: auth.user.uid,
      organization_id: orgResolved.org.orgId,
      product_id: productId,
      description: body.description,
      name: typeof body.name === "string" ? body.name : "",
      sku: typeof body.sku === "string" ? body.sku : "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,product_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const { productId } = await params;

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("description_drafts")
    .delete()
    .eq("organization_id", orgResolved.org.orgId)
    .eq("product_id", productId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
