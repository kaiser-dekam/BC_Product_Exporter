import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveCredentials } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { fetchProducts, fetchBrandMap } from "@/lib/bigcommerce/client";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;

  try {
    const body = await req.json();
    const resolved = await resolveCredentials(uid, body.credentials);
    if (resolved.error) return resolved.error;

    const products = await fetchProducts(resolved.config, { includeVariants: false });
    const brandMap = await fetchBrandMap(resolved.config);

    const productCacheRef = adminDb.collection("product_cache");
    const BATCH_LIMIT = 500;

    for (let i = 0; i < products.length; i += BATCH_LIMIT) {
      const batch = adminDb.batch();
      const chunk = products.slice(i, i + BATCH_LIMIT);

      for (const product of chunk) {
        const docId = `${uid}_${product.id}`;
        const ref = productCacheRef.doc(docId);

        const data = {
          id: `${uid}_${product.id}`,
          user_id: uid,
          bigcommerce_product_id: product.id,
          name: product.name,
          sku: product.sku || "",
          price: product.price || 0,
          sale_price: product.sale_price || 0,
          cost_price: product.cost_price || 0,
          description: product.description || "",
          primary_image_url: product.primary_image?.url_standard || "",
          image_urls: (product.images || []).map((img: { url_standard: string }) => img.url_standard),
          brand_name: brandMap[product.brand_id] || "",
          categories: product.categories || [],
          category_names: [] as string[],
          inventory_level: product.inventory_level || 0,
          is_visible: product.is_visible ?? true,
          availability: product.availability || "",
          weight: product.weight || 0,
          width: product.width || 0,
          height: product.height || 0,
          depth: product.depth || 0,
          custom_url: product.custom_url?.url || "",
          synced_at: FieldValue.serverTimestamp(),
          raw_data: product as unknown as Record<string, unknown>,
        };

        batch.set(ref, data, { merge: true });
      }

      await batch.commit();
    }

    const profileRef = adminDb.collection("profiles").doc(uid);
    await profileRef.set(
      {
        last_synced_at: FieldValue.serverTimestamp(),
        product_count: products.length,
      },
      { merge: true }
    );

    return NextResponse.json({ status: "ok", synced: products.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;

  try {

    const profileRef = adminDb.collection("profiles").doc(uid);
    const profileSnap = await profileRef.get();
    const profile = profileSnap.data() || {};

    return NextResponse.json({
      last_synced_at: profile.last_synced_at || null,
      product_count: profile.product_count || 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get sync status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
