import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  loadCredentialsFromProfile,
} from "@/lib/api-helpers";
import { fetchBrandMap } from "@/lib/bigcommerce/client";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const resolved = await loadCredentialsFromProfile(auth.user.uid);
  if (resolved.error) return resolved.error;

  try {
    const brandMap = await fetchBrandMap(resolved.config);

    return NextResponse.json({ brands: brandMap });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch brands";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
