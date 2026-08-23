import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createTwoFactorSetup } from "@/lib/two-factor";

export default async function SecurityPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    redirect("/login");
  }

  let qrCodeDataUrl: string | null = null;
  let secret: string | null = null;

  if (!user.twoFactorEnabled) {
    const setup = await createTwoFactorSetup(email);

    qrCodeDataUrl = await QRCode.toDataURL(setup.uri);
    secret = setup.secret;
  }

  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          Two-Factor Authentication
        </h1>

        {user.twoFactorEnabled ? (
          <div className="mt-6">
            <p className="font-semibold text-green-600">
              Two-factor authentication is enabled.
            </p>
          </div>
        ) : (
          <div className="mt-6">

            <p className="text-gray-600">
              Scan this QR code using Google Authenticator
              or another authenticator app.
            </p>

            {qrCodeDataUrl && (
              <div className="mt-6 flex justify-center">
                <img
                  src={qrCodeDataUrl}
                  alt="Two-factor authentication QR code"
                  className="h-64 w-64"
                />
              </div>
            )}

            {secret && (
              <div className="mt-6">

                <p className="text-sm text-gray-500">
                  Manual setup key
                </p>

                <code className="mt-2 block break-all rounded bg-gray-100 p-3">
                  {secret}
                </code>

              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
}