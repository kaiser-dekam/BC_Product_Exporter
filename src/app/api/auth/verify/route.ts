import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id_token } = body;

  if (!id_token) {
    return NextResponse.json({ error: "Missing id_token" }, { status: 400 });
  }

  const decoded = await verifyIdToken(id_token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return NextResponse.json({ uid: decoded.uid, email: decoded.email });
}
