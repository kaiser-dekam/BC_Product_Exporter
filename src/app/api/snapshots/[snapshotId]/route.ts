import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const { snapshotId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;

  let body: { label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.label || typeof body.label !== "string" || !body.label.trim()) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("product_snapshots")
      .update({ label: body.label.trim() })
      .eq("id", snapshotId)
      .eq("user_id", uid)
      .select("id, label")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to rename snapshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  const { snapshotId } = await params;
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const uid = auth.user.uid;

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("product_snapshots")
      .delete()
      .eq("id", snapshotId)
      .eq("user_id", uid)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete snapshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
