import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized, adminChallenge } from "@/lib/admin-auth";

/**
 * HTTP Basic Auth for the admin area (/admin and /api/admin/*).
 * See src/lib/admin-auth.ts for where the credentials come from.
 *
 * After the browser authenticates /admin it re-sends the same credentials to
 * the admin API routes automatically, so the admin page needs no changes.
 */
export function proxy(request: NextRequest) {
  if (isAdminAuthorized(request.headers.get("authorization"))) {
    return NextResponse.next();
  }
  return adminChallenge();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
