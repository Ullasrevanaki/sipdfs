import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "two_factor_verified";

export async function createTwoFactorSession(userId: string) {
  const token = crypto
    .createHmac("sha256", process.env.AUTH_SECRET!)
    .update(userId)
    .digest("hex");

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function isTwoFactorVerified(userId: string) {
  const token = crypto
    .createHmac("sha256", process.env.AUTH_SECRET!)
    .update(userId)
    .digest("hex");

  const cookieStore = await cookies();

  return cookieStore.get(COOKIE_NAME)?.value === token;
}

export async function clearTwoFactorSession() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}