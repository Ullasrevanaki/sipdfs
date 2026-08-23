import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  await prisma.user.update({
    where: {
      email: session.user.email,
    },
    data: {
      twoFactorSecret: null,
      twoFactorEnabled: false,
    },
  });

  return NextResponse.json({
    success: true,
    message: "2FA reset successfully",
  });
}