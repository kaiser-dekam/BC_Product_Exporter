import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { encrypt } from "@/lib/crypto";

// PUT - Save BigCommerce credentials (encrypted)
export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const { store_hash, client_id, access_token } = await req.json();

  if (!store_hash || !client_id || !access_token) {
    return NextResponse.json(
      { error: "Missing required fields: store_hash, client_id, access_token" },
      { status: 400 }
    );
  }

  const storeHashEnc = encrypt(store_hash);
  const clientIdEnc = encrypt(client_id);
  const accessTokenEnc = encrypt(access_token);

  const profileRef = adminDb.collection("profiles").doc(auth.user.uid);
  await profileRef.update({
    bigcommerce_credentials: {
      store_hash_encrypted: storeHashEnc.ciphertext,
      store_hash_iv: storeHashEnc.iv,
      store_hash_authTag: storeHashEnc.authTag,
      client_id_encrypted: clientIdEnc.ciphertext,
      client_id_iv: clientIdEnc.iv,
      client_id_authTag: clientIdEnc.authTag,
      access_token_encrypted: accessTokenEnc.ciphertext,
      access_token_iv: accessTokenEnc.iv,
      access_token_authTag: accessTokenEnc.authTag,
    },
    updated_at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ status: "ok" });
}

// POST - Test BigCommerce connection
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const { store_hash, client_id, access_token } = await req.json();

  if (!store_hash || !client_id || !access_token) {
    return NextResponse.json(
      { error: "Missing required fields: store_hash, client_id, access_token" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.bigcommerce.com/stores/${store_hash}/v3/catalog/products?limit=1`,
      {
        method: "GET",
        headers: {
          "X-Auth-Token": access_token,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: "ok",
        store_name: data.data?.[0]?.name || "Connected",
      });
    }

    const errorText = await response.text();
    return NextResponse.json(
      { error: `BigCommerce API error: ${errorText}` },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Connection failed: ${message}` },
      { status: 400 }
    );
  }
}
