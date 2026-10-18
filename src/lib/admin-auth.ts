/**
 * Admin credentials check (HTTP Basic Auth), shared by src/proxy.ts and the API
 * routes that must stay admin-only (e.g. deleting audience questions).
 *
 * Credentials come from ADMIN_USER / ADMIN_PASSWORD (set in Vercel). If they are
 * missing, nothing is authorized (fail closed).
 */
export function isAdminAuthorized(authorization: string | null): boolean {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password || !authorization) return false;
  const [scheme, encoded] = authorization.split(" ");
  if (scheme !== "Basic" || !encoded) return false;
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  return sep > 0 && decoded.slice(0, sep) === user && decoded.slice(sep + 1) === password;
}

/** 401 that makes the browser show its login prompt (same realm as /admin). */
export function adminChallenge(message = "مطلوب تسجيل الدخول للوحة الإدارة"): Response {
  return new Response(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SQAPS Admin", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
