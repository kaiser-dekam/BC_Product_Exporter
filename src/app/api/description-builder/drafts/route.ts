import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("description_drafts")
    .select("product_id,description,name,sku,updated_at")
    .eq("user_id", auth.user.uid);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out: Record<string, { description: string; name: string; sku: string; updatedAt: string }> = {};
  for (const r of data || []) {
    out[r.product_id] = {
      description: r.description || "",
      name: r.name || "",
      sku: r.sku || "",
      updatedAt: r.updated_at,
    };
  }
  return NextResponse.json({ data: out });
}
