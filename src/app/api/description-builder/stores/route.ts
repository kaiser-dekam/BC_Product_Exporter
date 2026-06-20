import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveOrg } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("store_name")
    .eq("id", orgResolved.org.orgId)
    .single();

  const name = data?.store_name || "Default Store";
  return NextResponse.json({ stores: [{ index: 0, name }], active: 0 });
}
