import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const doc = await adminDb.collection("books").doc(bookId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const data = doc.data()!;
    if (data.user_id !== uid) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ id: doc.id, ...data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const docRef = adminDb.collection("books").doc(bookId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const data = doc.data()!;
    if (data.user_id !== uid) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const body = await req.json();
    const allowedFields = [
      "title",
      "description",
      "status",
      "cover_config",
      "sections",
    ];

    const updateData: Record<string, unknown> = {
      updated_at: FieldValue.serverTimestamp(),
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Calculate page_count when sections are updated
    if (body.sections !== undefined) {
      const sections = body.sections as Array<{
        items?: Array<{ type?: string }>;
        products?: Array<unknown>;
      }>;
      let pageCount = 0;
      for (const section of sections) {
        pageCount += 1; // section title page
        // Support both new `items` format and old `products` format
        const items = section.items || section.products || [];
        pageCount += items.length;
      }
      updateData.page_count = pageCount;
    }

    await docRef.update(updateData);

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const docRef = adminDb.collection("books").doc(bookId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const data = doc.data()!;
    if (data.user_id !== uid) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
