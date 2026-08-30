import { signIn } from "@/auth";

export default function LoginPage() {
  async function handleGoogleLogin() {
    "use server";

    await signIn("google", {
      redirectTo: "/dashboard",
    });
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <section className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6">
        <div className="mb-12 text-center">
          <p className="mb-4 text-sm font-semibold tracking-[0.25em] text-[#60789b]">
            SECURE ACCESS
          </p>

          <h1 className="text-5xl font-extrabold tracking-tight">
            Welcome back
          </h1>

          <p className="mt-5 text-xl text-[#385777]">
            Sign in to manage your store inventory and insights.
          </p>
        </div>

        <div className="w-full max-w-[560px] rounded-[22px] bg-white p-10 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
          <form action={handleGoogleLogin}>
            <button
              type="submit"
              className="flex h-16 w-full items-center justify-center gap-3 rounded-[15px] bg-[#10182d] text-lg font-bold text-white transition hover:bg-[#18223d] active:scale-[0.99]"
            >
              <span className="text-xl font-bold">G</span>
              <span>Continue With Google</span>
            </button>
          </form>

          <div className="my-9 flex items-center gap-5">
            <div className="h-px flex-1 bg-[#d7e0eb]" />

            <span className="text-sm font-medium text-[#8aa0bf]">
              SECURE LOGIN
            </span>

            <div className="h-px flex-1 bg-[#d7e0eb]" />
          </div>

          <div className="rounded-[16px] bg-[#f7f9fc] p-6">
            <div className="flex gap-4">
              <div className="text-2xl">🔒</div>

              <div>
                <h2 className="font-bold text-[#0f172a]">
                  Secure Store Access
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#60789b]">
                  Sign in securely to manage your store inventory,
                  sales, purchases, forecasts and business insights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}