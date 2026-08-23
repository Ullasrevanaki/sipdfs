import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verify } from "otplib";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  const formData = await request.formData();

  const code = formData.get("code")?.toString();

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

  if (!user || !user.twoFactorSecret) {
    return NextResponse.redirect(
      new URL("/2fa?error=setup-error", request.url)
    );
  }

  const result = await verify({
    secret: user.twoFactorSecret,
    token: code,
  });

  if (!result.valid) {
    return NextResponse.redirect(
      new URL("/2fa?error=invalid-code", request.url)
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

  return NextResponse.redirect(
    new URL("/dashboard/security", request.url)
  );
}