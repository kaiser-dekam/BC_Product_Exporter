import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("store_name")
    .eq("id", auth.user.uid)
    .single();

  return NextResponse.json({ index: 0, name: data?.store_name || "Default Store" });
}
