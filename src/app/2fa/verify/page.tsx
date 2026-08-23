import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verify } from "otplib";
import { createTwoFactorSession } from "@/lib/two-factor-session";

export default async function VerifyTwoFactorPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    redirect("/dashboard");
  }

  async function verifyCode(formData: FormData) {
    "use server";

    const code = formData.get("code");

    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      redirect("/2fa/verify?error=invalid");
    }

    const currentSession = await auth();

    if (!currentSession?.user?.email) {
      redirect("/login");
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        email: currentSession.user.email,
      },
    });

    if (
      !currentUser?.twoFactorEnabled ||
      !currentUser.twoFactorSecret
    ) {
      redirect("/dashboard");
    }

    const result = await verify({
      secret: currentUser.twoFactorSecret,
      token: code,
    });

    if (!result.valid) {
      redirect("/2fa/verify?error=invalid");
    }

    // Create a verified 2FA session cookie
    await createTwoFactorSession(currentUser.id);

    // Now the user is allowed to access the dashboard
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

          <h1 className="text-3xl font-bold text-slate-900">
            Two-Step Verification
          </h1>

          <p className="mt-4 text-slate-700">
            Enter the 6-digit code from your authenticator app to continue.
          </p>

          <form action={verifyCode} className="mt-8">

            <label
              htmlFor="code"
              className="block text-sm font-semibold text-slate-900"
            >
              Verification code
            </label>

            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              placeholder="123456"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em] text-slate-900 outline-none focus:border-slate-900"
            />

            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Verify
            </button>

          </form>

        </div>
      </div>
    </main>
  );
}