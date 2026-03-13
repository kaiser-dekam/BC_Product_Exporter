import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns the book if uid is the owner OR if the owner has added the user's
 * email as a collaborator. Returns null if not found / no access.
 */
async function getAccessibleBook(
  supabase: SupabaseClient,
  bookId: string,
  uid: string,
  email: string | undefined
) {
  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (!book) return null;
  if (book.user_id === uid) return book;

  if (email) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("collaborator_emails")
      .eq("id", book.user_id)
      .single();

    if (
      Array.isArray(ownerProfile?.collaborator_emails) &&
      ownerProfile.collaborator_emails.includes(email)
    ) {
      return book;
    }
  }

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  try {
    const supabase = createAdminClient();
    const book = await getAccessibleBook(
      supabase,
      bookId,
      auth.user.uid,
      auth.user.email
    );

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json(book);
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

  try {
    const supabase = createAdminClient();

    const existing = await getAccessibleBook(
      supabase,
      bookId,
      auth.user.uid,
      auth.user.email
    );

    if (!existing) {
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

    const updateData: Record<string, unknown> = {};

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

    const { error: updateError } = await supabase
      .from("books")
      .update(updateData)
      .eq("id", bookId);

    if (updateError) throw updateError;

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
    const supabase = createAdminClient();
    // Only the owner can delete
    const { error } = await supabase
      .from("books")
      .delete()
      .eq("id", bookId)
      .eq("user_id", uid);

    if (error) throw error;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
