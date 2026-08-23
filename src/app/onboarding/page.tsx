import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    include: {
      store: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  // If the user already has a store,
  // there is no reason to show onboarding again.
  if (user.store) {
    redirect("/dashboard");
  }

  async function createStore(formData: FormData) {
    "use server";

    const storeName = formData.get("storeName");

    if (
      typeof storeName !== "string" ||
      storeName.trim().length < 2
    ) {
      redirect("/onboarding?error=invalid-store-name");
    }

    const currentSession = await auth();

    if (!currentSession?.user?.email) {
      redirect("/login");
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        email: currentSession.user.email,
      },
      include: {
        store: true,
      },
    });

    if (!currentUser) {
      redirect("/login");
    }

    // Prevent creating a second store.
    if (currentUser.store) {
      redirect("/dashboard");
    }

    await prisma.store.create({
      data: {
        name: storeName.trim(),
        ownerId: currentUser.id,
      },
    });

    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-12 text-[#0f172a]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-[22px] bg-white p-10 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
          <div className="text-center">
            <p className="mb-4 text-sm font-semibold tracking-[0.25em] text-[#60789b]">
              STORE SETUP
            </p>

            <h1 className="text-4xl font-extrabold tracking-tight">
              Welcome to SIPDFS
            </h1>

            <p className="mt-4 text-lg text-[#385777]">
              Let's set up your store before you get started.
            </p>
          </div>

          <form action={createStore} className="mt-10">
            <label
              htmlFor="storeName"
              className="block text-sm font-bold text-[#0f172a]"
            >
              Store Name
            </label>

            <input
              id="storeName"
              name="storeName"
              type="text"
              placeholder="Enter your store name"
              required
              minLength={2}
              maxLength={100}
              className="mt-2 h-14 w-full rounded-[12px] border border-[#d7e0eb] bg-white px-4 text-base text-[#0f172a] outline-none transition focus:border-[#10182d] focus:ring-2 focus:ring-[#10182d]/10"
            />

            <p className="mt-2 text-sm text-[#60789b]">
              You can change additional store details later from Settings.
            </p>

            <button
              type="submit"
              className="mt-7 h-14 w-full rounded-[12px] bg-[#10182d] text-base font-bold text-white transition hover:bg-[#18223d] active:scale-[0.99]"
            >
              Get Started
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}