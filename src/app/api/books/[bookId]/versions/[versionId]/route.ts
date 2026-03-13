import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * POST — Restore a saved version (overwrites the book's current state).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; versionId: string }> }
) {
  const { bookId, versionId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  try {
    const supabase = createAdminClient();

    // Verify ownership
    const { data: book } = await supabase
      .from("books")
      .select("id, user_id")
      .eq("id", bookId)
      .single();

    if (!book || book.user_id !== auth.user.uid) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Fetch the version snapshot
    const { data: version } = await supabase
      .from("book_versions")
      .select("title, description, cover_config, sections")
      .eq("id", versionId)
      .eq("book_id", bookId)
      .single();

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Calculate page_count from restored sections
    const sections = (version.sections || []) as Array<{
      items?: Array<{ type?: string }>;
      products?: Array<unknown>;
    }>;
    let pageCount = 0;
    for (const section of sections) {
      pageCount += 1;
      const items = section.items || section.products || [];
      pageCount += items.length;
    }

    // Overwrite the book with the version snapshot
    const { error: updateError } = await supabase
      .from("books")
      .update({
        title: version.title,
        description: version.description,
        cover_config: version.cover_config,
        sections: version.sections,
        page_count: pageCount,
      })
      .eq("id", bookId);

    if (updateError) throw updateError;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to restore version";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE — Remove a saved version.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; versionId: string }> }
) {
  const { bookId, versionId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  try {
    const supabase = createAdminClient();

    // Only the owner can delete versions
    const { error } = await supabase
      .from("book_versions")
      .delete()
      .eq("id", versionId)
      .eq("book_id", bookId)
      .eq("user_id", auth.user.uid);

    if (error) throw error;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete version";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
