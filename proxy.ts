// Next.js 16 `proxy` (the replacement for `middleware`). Runs on the Node.js
// runtime before every matched request. This is an OPTIMISTIC gate only — it
// reads the session cookie to redirect users before paint. It does NOT verify
// the JWT signature (that would mean a network call on every navigation); real
// enforcement is the Cognito JWT authorizer on the API Gateway, so a forged
// cookie buys nothing — the backend rejects requests without a valid token.
// The route handlers under /api verify the token themselves (lib/auth/verify).

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isTokenValid } from "@/lib/auth/session";

// The signed-in workspace: one entry per top-level folder in app/(app). A new
// folder there must be added here (and to app/robots.ts). AppShell also sends
// signed-out visitors to /login, so a missed entry still does not open a page.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/reports",
  "/contracts",
  "/draft",
  "/help",
  "/insights",
  "/library",
  "/notifications",
  "/onboarding",
  "/projects",
  "/renewals",
  "/settings",
  "/workflow",
  "/design-system",
];

// Screens a signed-in user has no reason to sit on.
const SIGNED_OUT_ONLY = new Set(["/login", "/signup"]);

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = isTokenValid(token);

  if (authed && SIGNED_OUT_ONLY.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Signed-out visitors to the workspace go to login, keeping where they were
  // headed. Everything else passes through: the marketing and legal pages, the
  // metadata routes (robots.txt, sitemap.xml, manifest, social image), and any
  // unknown path, which gets the 404 page rather than a sign-in screen.
  if (!authed && isProtected(pathname)) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("redirect", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip API routes, build assets and files served by extension (public/).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
