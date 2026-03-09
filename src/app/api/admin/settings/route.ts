import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  requireAdmin,
  getSiteSettings,
} from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

const ALLOWED_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-haiku-3-5-20241022",
  "claude-opus-4-20250514",
];

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const adminCheck = await requireAdmin(auth.user.uid);
  if (adminCheck.error) return adminCheck.error;

  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const adminCheck = await requireAdmin(auth.user.uid);
  if (adminCheck.error) return adminCheck.error;

  const body = await req.json();
  const { default_claude_model } = body;

  if (!default_claude_model || !ALLOWED_MODELS.includes(default_claude_model)) {
    return NextResponse.json(
      {
        error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  await supabase
    .from("site_settings")
    .update({
      default_claude_model,
      updated_by: auth.user.uid,
    })
    .eq("id", "global");

  return NextResponse.json({ status: "ok" });
}
