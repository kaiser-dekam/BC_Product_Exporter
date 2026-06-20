import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, loadCredentialsFromProfile, resolveOrg } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { bcRaw } from "@/lib/bigcommerce/raw";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;
  const { orgId } = orgResolved.org;

  const creds = await loadCredentialsFromProfile(auth.user.uid);
  if (creds.error) return creds.error;

  const { productId } = await params;
  const supabase = createAdminClient();

  const { data: draft, error: readErr } = await supabase
    .from("description_drafts")
    .select("description")
    .eq("organization_id", orgId)
    .eq("product_id", productId)
    .maybeSingle();

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!draft) return NextResponse.json({ error: "No draft to publish" }, { status: 404 });

  const result = await bcRaw(creds.config, "PUT", `/catalog/products/${productId}`, {
    description: draft.description,
  });

  if (result.status >= 200 && result.status < 300) {
    await supabase
      .from("description_drafts")
      .delete()
      .eq("organization_id", orgId)
      .eq("product_id", productId);
    return NextResponse.json({ ok: true, data: result.data });
  }
  return NextResponse.json({ ok: false, data: result.data }, { status: result.status });
}
