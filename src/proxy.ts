import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const TWO_FACTOR_COOKIE = "two_factor_verified";

async function verifyTwoFactorCookie(
  token: string | undefined,
  userId: string
) {
  if (!token) {
    return false;
  }

  try {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      return false;
    }

    const key = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(token, key);

    return (
      payload.userId === userId &&
      payload.verified === true
    );
  } catch {
    return false;
  }
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  if (!request.auth?.user?.id) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  const twoFactorCookie = request.cookies.get(
    TWO_FACTOR_COOKIE
  )?.value;

  return verifyTwoFactorCookie(
    twoFactorCookie,
    request.auth.user.id
  ).then((verified) => {
    if (!verified) {
      return NextResponse.redirect(
        new URL("/2fa", request.url)
      );
    }

    return NextResponse.next();
  });
});

export const config = {
  matcher: ["/dashboard/:path*"],
};