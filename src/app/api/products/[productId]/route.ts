import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const doc = await adminDb.collection("product_cache").doc(productId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const data = doc.data()!;

    // Verify ownership
    if (data.user_id !== uid) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Return all fields except raw_data (the full BigCommerce JSON blob)
    const { raw_data: _raw, ...rest } = data;

    return NextResponse.json({ id: doc.id, ...rest });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
