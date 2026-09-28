import { NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";

// Rutas sin login.
const PUBLIC = ["/login", "/api/login", "/api/logout"];

function matches(pathname, prefixes) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
  if (matches(pathname, PUBLIC)) return NextResponse.next();

  if (!(await isValidSession(request.cookies.get(SESSION_COOKIE)?.value))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión vencida o inexistente", code: "unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (pathname === "/") return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
