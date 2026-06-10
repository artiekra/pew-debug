import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const targetUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000"

  if (request.nextUrl.pathname === "/api/v1/inject") {
    const url = new URL("/api/v1/inject/", targetUrl)
    url.search = request.nextUrl.search
    return NextResponse.rewrite(url)
  }

  if (request.nextUrl.pathname.startsWith("/api/v1/play/")) {
    const url = new URL(request.nextUrl.pathname, targetUrl)
    url.search = request.nextUrl.search
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/v1/inject",
    "/api/v1/play/:path*",
  ],
}
