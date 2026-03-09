import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const uid = auth.user.uid;

  try {
    const supabase = createAdminClient();
    const { data: books, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ books: books || [] });
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

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("books")
      .insert({
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
        page_count: 0,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id, status: "ok" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
