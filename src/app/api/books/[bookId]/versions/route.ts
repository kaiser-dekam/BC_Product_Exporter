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

  try {
    const supabase = createAdminClient();

    // Verify the user has access to this book
    const { data: book } = await supabase
      .from("books")
      .select("id, user_id")
      .eq("id", bookId)
      .single();

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Check ownership or collaborator access
    if (book.user_id !== auth.user.uid) {
      if (auth.user.email) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("collaborator_emails")
          .eq("id", book.user_id)
          .single();

        if (
          !Array.isArray(ownerProfile?.collaborator_emails) ||
          !ownerProfile.collaborator_emails.includes(auth.user.email)
        ) {
          return NextResponse.json({ error: "Book not found" }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: "Book not found" }, { status: 404 });
      }
    }

    // Fetch versions (lightweight — no sections/cover_config payload)
    const { data: versions, error } = await supabase
      .from("book_versions")
      .select("id, label, created_at")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ versions: versions ?? [] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch versions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  try {
    const supabase = createAdminClient();

    // Fetch the current book state
    const { data: book } = await supabase
      .from("books")
      .select("id, user_id, title, description, cover_config, sections")
      .eq("id", bookId)
      .single();

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Only the owner can save versions
    if (book.user_id !== auth.user.uid) {
      return NextResponse.json({ error: "Only the book owner can save versions" }, { status: 403 });
    }

    const body = await req.json();
    const label = (body.label || "").trim();

    if (!label) {
      return NextResponse.json({ error: "Label is required" }, { status: 400 });
    }

    // Create the version snapshot
    const { data: version, error } = await supabase
      .from("book_versions")
      .insert({
        book_id: bookId,
        user_id: auth.user.uid,
        label,
        title: book.title,
        description: book.description,
        cover_config: book.cover_config,
        sections: book.sections,
      })
      .select("id, label, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save version";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
