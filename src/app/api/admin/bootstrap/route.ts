import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  // Check if any admin already exists
  const adminsSnapshot = await adminDb
    .collection("profiles")
    .where("role", "==", "admin")
    .limit(1)
    .get();

  if (!adminsSnapshot.empty) {
    return NextResponse.json(
      {
        error:
          "An admin already exists. Use the Firestore console to add more admins.",
      },
      { status: 403 }
    );
  }

  // Promote the caller to admin
  const profileRef = adminDb.collection("profiles").doc(auth.user.uid);
  const profileDoc = await profileRef.get();

  if (!profileDoc.exists) {
    return NextResponse.json(
      { error: "Profile not found. Please complete signup first." },
      { status: 404 }
    );
  }

  await profileRef.update({
    role: "admin",
    updated_at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    status: "ok",
    message: "You are now an admin.",
  });
}
