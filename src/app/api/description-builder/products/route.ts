import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, loadCredentialsFromProfile } from "@/lib/api-helpers";
import { bcRaw } from "@/lib/bigcommerce/raw";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const creds = await loadCredentialsFromProfile(auth.user.uid);
  if (creds.error) return creds.error;

  const url = new URL(req.url);
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "50";
  const keyword = url.searchParams.get("keyword");

  let path = `/catalog/products?include=images&limit=${limit}&page=${page}&sort=name`;
  if (keyword) path += `&keyword=${encodeURIComponent(keyword)}`;

  const result = await bcRaw(creds.config, "GET", path);
  return NextResponse.json(result.data, { status: result.status });
}
