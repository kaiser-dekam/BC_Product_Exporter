import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const snapshot = await adminDb
      .collection("books")
      .where("user_id", "==", uid)
      .orderBy("updated_at", "desc")
      .get();

    const books = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ books });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch books";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const body = await req.json();
    const { title, description } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection("books").add({
      user_id: uid,
      title,
      description: description || "",
      status: "draft",
      cover_config: {
        background_color: "#0f172a",
        title_font_size: 32,
        subtitle: "",
        logo_url: null,
      },
      sections: [],
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      page_count: 0,
    });

    return NextResponse.json({ id: docRef.id, status: "ok" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
