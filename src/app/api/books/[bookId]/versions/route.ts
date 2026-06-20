import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveOrg } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;

  try {
    const supabase = createAdminClient();

    // Verify the book belongs to the user's organization
    const { data: book } = await supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .eq("organization_id", orgResolved.org.orgId)
      .single();

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
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

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;

  try {
    const supabase = createAdminClient();

    // Fetch the current book state (must belong to the org)
    const { data: book } = await supabase
      .from("books")
      .select("id, title, description, cover_config, sections")
      .eq("id", bookId)
      .eq("organization_id", orgResolved.org.orgId)
      .single();

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
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
        organization_id: orgResolved.org.orgId,
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
