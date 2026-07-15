import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/sso-verify", // endpoint SSO dari Z One
  "/api/register",
  "/api/admin/cross-app",
  "/api/demo",  // demo endpoints auth via Bearer token sendiri
  "/sso", // halaman landing SSO dari Z One
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isStatic = pathname.startsWith("/_next") || pathname === "/favicon.ico";

  if (isStatic) return NextResponse.next();

  const token = req.cookies.get("session_token")?.value;

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/pos", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
