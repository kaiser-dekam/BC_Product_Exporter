import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, loadCredentialsFromProfile } from "@/lib/api-helpers";
import { bcRaw } from "@/lib/bigcommerce/raw";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const creds = await loadCredentialsFromProfile(auth.user.uid);
  if (creds.error) return creds.error;

  const { id } = await params;
  const result = await bcRaw(creds.config, "GET", `/catalog/products/${id}?include=images`);
  return NextResponse.json(result.data, { status: result.status });
}
