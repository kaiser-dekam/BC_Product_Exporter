import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveCredentials } from "@/lib/api-helpers";
import { fetchProducts } from "@/lib/bigcommerce/client";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  let body: {
    limit?: number;
    credentials?: {
      store_hash: string;
      client_id: string;
      access_token: string;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { limit = 1, credentials } = body;

  const resolved = await resolveCredentials(auth.user.uid, credentials);
  if (resolved.error) return resolved.error;

  try {
    const products = await fetchProducts(resolved.config, {
      maxItems: limit,
      pageSize: limit,
    });

    return NextResponse.json({
      products,
      count: products.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
