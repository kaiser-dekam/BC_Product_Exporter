import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";

// Fields for list view (excludes raw_data, description, image_urls, categories, category_names)
const LIST_FIELDS = [
  "user_id",
  "bigcommerce_product_id",
  "name",
  "sku",
  "price",
  "sale_price",
  "cost_price",
  "primary_image_url",
  "brand_name",
  "inventory_level",
  "is_visible",
  "availability",
  "weight",
  "width",
  "height",
  "depth",
  "custom_url",
  "claude_summary",
  "claude_specs",
  "claude_weight_dims",
  "claude_model_used",
  "summarized_at",
  "synced_at",
];

// Minimal fields for ProductPicker modal
const PICKER_FIELDS = [
  "user_id",
  "name",
  "sku",
  "price",
  "primary_image_url",
  "brand_name",
  "claude_summary",
];

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;
  const { searchParams } = new URL(req.url);

  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 50, 1),
    200
  );
  const cursor = searchParams.get("cursor") || "";
  const mode = searchParams.get("mode") || "";

  const fields = mode === "picker" ? PICKER_FIELDS : LIST_FIELDS;

  try {
    // Try server-side sort + cursor pagination (requires composite index)
    try {
      const result = await fetchWithIndex(uid, fields, limit, cursor);
      const total = await getProductCount(uid);

      return NextResponse.json({
        products: result.products,
        total,
        next_cursor: result.nextCursor,
      });
    } catch (err: unknown) {
      // Fallback if composite index isn't built yet (FAILED_PRECONDITION)
      if (isFailedPrecondition(err)) {
        const result = await fetchFallback(uid, fields, limit, cursor ? Number(cursor) || 0 : 0);
        return NextResponse.json({
          products: result.products,
          total: result.total,
          next_cursor: result.nextCursor,
        });
      }
      throw err;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Primary path: server-side orderBy(name) + cursor pagination with .select() */
async function fetchWithIndex(
  uid: string,
  fields: string[],
  limit: number,
  cursor: string
) {
  let query = adminDb
    .collection("product_cache")
    .where("user_id", "==", uid)
    .orderBy("name")
    .select(...fields)
    .limit(limit + 1);

  if (cursor) {
    const cursorDoc = await adminDb.collection("product_cache").doc(cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  const docs = snapshot.docs;
  const hasMore = docs.length > limit;
  const pageDocs = hasMore ? docs.slice(0, limit) : docs;

  const products = pageDocs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const nextCursor = hasMore ? pageDocs[pageDocs.length - 1].id : null;
  return { products, nextCursor };
}

/** Fallback: no composite index, load all with .select(), sort in-memory, paginate by offset */
async function fetchFallback(
  uid: string,
  fields: string[],
  limit: number,
  offset: number
) {
  const snapshot = await adminDb
    .collection("product_cache")
    .where("user_id", "==", uid)
    .select(...fields)
    .get();

  const products = snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as { name?: string }),
    }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const total = products.length;
  const paged = products.slice(offset, offset + limit);
  const nextCursor = offset + limit < total ? String(offset + limit) : null;

  return { products: paged, total, nextCursor };
}

/** Get total product count (uses Firestore aggregation — 1 read, not N) */
async function getProductCount(uid: string): Promise<number> {
  const countSnapshot = await adminDb
    .collection("product_cache")
    .where("user_id", "==", uid)
    .count()
    .get();
  return countSnapshot.data().count;
}

/** Check if a Firestore error is FAILED_PRECONDITION (missing composite index) */
function isFailedPrecondition(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { code?: number | string; message?: string };
    return (
      e.code === 9 ||
      e.code === "failed-precondition" ||
      (typeof e.message === "string" && e.message.includes("FAILED_PRECONDITION"))
    );
  }
  return false;
}
