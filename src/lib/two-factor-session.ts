import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "two_factor_verified";

function getSecretKey() {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

export async function createTwoFactorSession(userId: string) {
  const token = await new SignJWT({
    userId,
    verified: true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey());

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function isTwoFactorVerified(userId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return false;
    }

    const { payload } = await jwtVerify(token, getSecretKey());

    return (
      payload.userId === userId &&
      payload.verified === true
    );
  } catch {
    return false;
  }
}

export async function clearTwoFactorSession() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}