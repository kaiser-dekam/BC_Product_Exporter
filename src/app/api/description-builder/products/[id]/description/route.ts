import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, loadCredentialsFromProfile } from "@/lib/api-helpers";
import { bcRaw } from "@/lib/bigcommerce/raw";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;
  const creds = await loadCredentialsFromProfile(auth.user.uid);
  if (creds.error) return creds.error;

  let body: { description?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.description !== "string") {
    return NextResponse.json({ error: "description must be a string" }, { status: 400 });
  }

  const { id } = await params;
  const result = await bcRaw(creds.config, "PUT", `/catalog/products/${id}`, {
    description: body.description,
  });
  return NextResponse.json(result.data, { status: result.status });
}
