import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";

type TwoFactorPageProps = {
  searchParams: Promise<{
    reset?: string;
  }>;
};

export default async function TwoFactorPage({
  searchParams,
}: TwoFactorPageProps) {
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

  const params = await searchParams;
  const reset = params.reset === "1";

  /*
   * If 2FA is already enabled, normally send the user
   * back to the dashboard.
   *
   * But /2fa?reset=1 allows the user to set up a
   * new authenticator after losing the old one.
   */
  if (user.twoFactorEnabled && !reset) {
    redirect("/dashboard");
  }

  let secret = user.twoFactorSecret;

  /*
   * Generate a NEW secret when:
   *
   * 1. There is no existing secret
   * OR
   * 2. User explicitly requested a reset
   */
  if (!secret || reset) {
    secret = generateSecret();

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
    });
  }

  const otpAuthUrl = generateURI({
    issuer: "SIPDFS",
    label: user.email,
    secret,
  });

  const qrCode = await QRCode.toDataURL(otpAuthUrl);

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">

          <h1 className="text-3xl font-bold text-slate-900">
            Two-Factor Authentication
          </h1>

          <p className="mt-4 text-slate-700">
            Scan this QR code using Google Authenticator
            or another authenticator app.
          </p>

          {/* QR CODE */}

          <div className="mt-8 flex justify-center">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <img
                src={qrCode}
                alt="Two-factor authentication QR code"
                width={250}
                height={250}
              />
            </div>
          </div>

          {/* MANUAL KEY */}

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Manual setup key
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              If you cannot scan the QR code, enter this key
              manually into your authenticator app.
            </p>

            <div className="mt-3 rounded-lg border border-gray-300 bg-gray-100 p-4 text-center">
              <code className="break-all font-mono text-base font-semibold text-slate-900">
                {secret}
              </code>
            </div>
          </div>

          {/* VERIFICATION */}

          <div className="mt-8">
            <p className="text-sm text-slate-700">
              After scanning the QR code, enter the 6-digit
              code shown in your authenticator app.
            </p>

            <form
              action="/api/2fa/verify"
              method="POST"
              className="mt-4"
            >
              <input
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="123456"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-[0.4em] text-slate-900 outline-none focus:border-slate-900"
              />

              <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Verify & Enable 2FA
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}