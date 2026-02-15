// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set("Access-Control-Allow-Headers", "*");

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
