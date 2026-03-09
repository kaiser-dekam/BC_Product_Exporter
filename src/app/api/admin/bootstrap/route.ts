import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  // Check if any admin already exists
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (admins && admins.length > 0) {
    return NextResponse.json(
      {
        error:
          "An admin already exists. Use the Supabase dashboard to add more admins.",
      },
      { status: 403 }
    );
  }

  // Verify profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", auth.user.uid)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found. Please complete signup first." },
      { status: 404 }
    );
  }

  // Promote the caller to admin
  await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", auth.user.uid);

  return NextResponse.json({
    status: "ok",
    message: "You are now an admin.",
  });
}
