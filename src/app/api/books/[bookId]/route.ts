import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("user_id", uid)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json(data);
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
    const supabase = createAdminClient();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .eq("user_id", uid)
      .single();

    if (fetchError || !existing) {
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
      .eq("id", bookId)
      .eq("user_id", uid);

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
