import { NextRequest, NextResponse } from "next/server";

/**
 * Sets a `user_role` cookie that the Next.js middleware reads to enforce
 * route-level RBAC for admin-only pages (`/students`, `/subjects`, `/teachers`).
 *
 * Trust model: the cookie is a UX convenience, not a security boundary.
 * Authoritative permission checks remain on the API tier (`requireRole`).
 * The middleware uses this cookie only to bounce member-role users away
 * from admin-only pages with a toast — preventing the flash of restricted
 * UI rather than enforcing access control.
 *
 * The role value is supplied by the client after `/api/members` resolves;
 * a malicious client could lie about its role to *unblock* admin routes,
 * but server-side `requireRole` checks would still reject the actions.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const role =
    typeof body === "object" && body !== null && "role" in body
      ? (body as { role: unknown }).role
      : undefined;

  const allowed = ["owner", "admin", "member"] as const;
  if (typeof role !== "string" || !(allowed as readonly string[]).includes(role)) {
    return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("user_role", role, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });
  return res;
}
