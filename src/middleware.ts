import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED = ["/dashboard", "/verify", "/salaries", "/benchmark", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/verify", "/salaries/:path*", "/benchmark", "/admin/:path*"],
};
