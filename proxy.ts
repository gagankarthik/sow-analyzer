// Next.js 16 `proxy` (the replacement for `middleware`). Runs on the Node.js
// runtime before every matched request. This is an OPTIMISTIC gate only — it
// reads the session cookie to redirect users before paint. It does NOT verify
// the JWT signature (that would mean a network call on every navigation); real
// enforcement is the Cognito JWT authorizer on the API Gateway, so a forged
// cookie buys nothing — the backend rejects requests without a valid token.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isTokenValid } from "@/lib/auth/session";

// Routes reachable without authentication.
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/confirm",
  "/reset",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  // marketing/legal pages, if added later
  if (pathname.startsWith("/legal")) return true;
  return false;
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = isTokenValid(token);
  const publicRoute = isPublic(pathname);

  // Authenticated users shouldn't sit on the auth screens.
  if (authed && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Unauthenticated users hitting a protected route get bounced to login,
  // preserving where they were headed.
  if (!authed && !publicRoute) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("redirect", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$).*)"],
};
