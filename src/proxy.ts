import { NextResponse, type NextRequest } from "next/server";

/**
 * HTTP Basic Auth for the admin area (/admin and /api/admin/*).
 *
 * Credentials come from ADMIN_USER / ADMIN_PASSWORD (set in Vercel) — never
 * hard-code them: the repository is public. If they are missing, the admin
 * area stays locked (fail closed).
 *
 * After the browser authenticates /admin it re-sends the same credentials to
 * the admin API routes automatically, so the admin page needs no changes.
 */
export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (user && password) {
    const header = request.headers.get("authorization") ?? "";
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const sep = decoded.indexOf(":");
      if (decoded.slice(0, sep) === user && decoded.slice(sep + 1) === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("مطلوب تسجيل الدخول للوحة الإدارة", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SQAPS Admin", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
