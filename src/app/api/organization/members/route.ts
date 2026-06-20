import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveOrg, requireOrgOwner } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/organization/members — list members + pending invites for the org.
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const orgResolved = await resolveOrg(auth.user.uid);
  if (orgResolved.error) return orgResolved.error;
  const { orgId } = orgResolved.org;

  const supabase = createAdminClient();

  const [membersRes, invitesRes] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id, org_role, created_at, profiles(email, full_name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_invites")
      .select("id, email, org_role, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
  ]);

  if (membersRes.error) {
    return NextResponse.json({ error: membersRes.error.message }, { status: 500 });
  }

  const members = (membersRes.data ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      user_id: m.user_id,
      email: profile?.email ?? "",
      full_name: profile?.full_name ?? "",
      org_role: m.org_role,
      is_you: m.user_id === auth.user.uid,
    };
  });

  return NextResponse.json({
    members,
    invites: invitesRes.data ?? [],
    your_role: orgResolved.org.orgRole,
  });
}

// POST /api/organization/members — invite a user by email (Owner only).
// If the email already has an account they're added immediately; otherwise a
// pending invite is created that activates when they sign up.
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const owner = await requireOrgOwner(auth.user.uid);
  if (owner.error) return owner.error;
  const { orgId } = owner.org;

  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const orgRole = body?.org_role === "owner" ? "owner" : "editor";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Already a member?
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile) {
    const { data: alreadyMember } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (alreadyMember) {
      return NextResponse.json(
        { error: "That user is already a member" },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("organization_members")
      .insert({ org_id: orgId, user_id: existingProfile.id, org_role: orgRole });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "added", added: true }, { status: 201 });
  }

  // No account yet — create a pending invite.
  const { error } = await supabase
    .from("organization_invites")
    .upsert(
      { org_id: orgId, email, org_role: orgRole, invited_by: auth.user.uid },
      { onConflict: "org_id,email" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "invited", added: false }, { status: 201 });
}
