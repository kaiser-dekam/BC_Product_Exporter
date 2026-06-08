import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, loadCredentialsFromProfile } from "@/lib/api-helpers";
import { bcRaw } from "@/lib/bigcommerce/raw";

interface BCLibraryProduct {
  id: number;
  name: string;
  sku: string;
  description: string;
  is_visible: boolean;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const creds = await loadCredentialsFromProfile(auth.user.uid);
  if (creds.error) return creds.error;

  const url = new URL(req.url);
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "50";
  const keyword = url.searchParams.get("keyword");

  let path = `/catalog/products?include_fields=name,sku,description,is_visible&limit=${limit}&page=${page}&sort=name`;
  if (keyword) path += `&keyword=${encodeURIComponent(keyword)}`;

  const result = await bcRaw<{
    data: BCLibraryProduct[];
    meta?: { pagination?: unknown };
  }>(creds.config, "GET", path);

  if (result.status >= 400) {
    return NextResponse.json(result.data, { status: result.status });
  }

  const products = (result.data.data || []).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku || "",
    description: p.description || "",
    is_visible: p.is_visible === true,
  }));
  const pagination = result.data.meta?.pagination || {};
  return NextResponse.json({ data: products, pagination });
}
