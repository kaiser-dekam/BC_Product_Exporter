import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search")?.trim() || "";
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 50, 1),
    200
  );
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  try {
    // Total count for this user (unfiltered)
    const countSnapshot = await adminDb
      .collection("product_cache")
      .where("user_id", "==", uid)
      .count()
      .get();
    const total = countSnapshot.data().count;

    // Build the query
    let query = adminDb
      .collection("product_cache")
      .where("user_id", "==", uid)
      .orderBy("name", "asc");

    if (search) {
      query = query
        .where("name", ">=", search)
        .where("name", "<=", search + "\uf8ff");
    }

    const snapshot = await query.offset(offset).limit(limit).get();

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ products, total });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
