import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  if (request.auth?.user) {
    return NextResponse.next();
  }

  return NextResponse.redirect(
    new URL("/login", request.url)
  );
});

export const config = {
  matcher: ["/dashboard/:path*"],
};