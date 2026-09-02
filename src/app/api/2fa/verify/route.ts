import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verify } from "otplib";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";

const TWO_FACTOR_COOKIE = "two_factor_verified";

export async function POST(request: Request) {
  try {
    console.log("2FA VERIFY: request received");

    const session = await auth();

    console.log(
      "2FA VERIFY: session:",
      session?.user?.email ? "authenticated" : "missing"
    );

    if (!session?.user?.email) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }

    const formData = await request.formData();
    const code = formData.get("code")?.toString();

    console.log(
      "2FA VERIFY: code format:",
      code && /^\d{6}$/.test(code) ? "valid format" : "invalid format"
    );

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.redirect(
        new URL("/2fa?error=invalid-code", request.url)
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    console.log(
      "2FA VERIFY: user:",
      user ? "found" : "NOT FOUND"
    );

    console.log(
      "2FA VERIFY: secret:",
      user?.twoFactorSecret ? "exists" : "MISSING"
    );

    if (!user || !user.twoFactorSecret) {
      console.log("2FA VERIFY: setup error - no user or secret");

      return NextResponse.redirect(
        new URL("/2fa?error=setup-error", request.url)
      );
    }

    const result = await verify({
      secret: user.twoFactorSecret,
      token: code,
    });

    console.log(
      "2FA VERIFY: TOTP:",
      result.valid ? "VALID" : "INVALID"
    );

    if (!result.valid) {
      return NextResponse.redirect(
        new URL("/2fa?error=invalid-code", request.url)
      );
    }

    const secret = process.env.AUTH_SECRET;

    console.log(
      "2FA VERIFY: AUTH_SECRET:",
      secret ? "exists" : "MISSING"
    );

    if (!secret) {
      console.log("2FA VERIFY: setup error - AUTH_SECRET missing");

      return NextResponse.redirect(
        new URL("/2fa?error=setup-error", request.url)
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        twoFactorEnabled: true,
      },
    });

    console.log("2FA VERIFY: database updated");

    const key = new TextEncoder().encode(secret);

    const token = await new SignJWT({
      userId: user.id,
      verified: true,
    })
      .setProtectedHeader({
        alg: "HS256",
      })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(key);

    console.log("2FA VERIFY: JWT created");

    const response = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );

    response.cookies.set({
      name: TWO_FACTOR_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    console.log("2FA VERIFY: cookie created");
    console.log("2FA VERIFY: SUCCESS");

    return response;
  } catch (error) {
    console.error("2FA VERIFY: UNEXPECTED ERROR:", error);

    return NextResponse.redirect(
      new URL("/2fa?error=setup-error", request.url)
    );
  }
}