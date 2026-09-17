"use client";

import { signIn, signOut } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleGoogleLogin() {
    setIsSigningIn(true);

    // A login page can be opened while another user is still signed in.
    // Clear that session before selecting the Google account so Auth.js does
    // not try to link that account to the wrong user.
    await signOut({ redirect: false });
    await signIn("google", {
      redirectTo: "/dashboard",
      prompt: "select_account",
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6">
      <div className="w-full max-w-[560px] rounded-[22px] bg-white p-10 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold tracking-[0.25em] text-[#60789b]">
            SECURE ACCESS
          </p>

          <h1 className="text-5xl font-extrabold tracking-tight text-[#0f172a]">
            Welcome back
          </h1>

          <p className="mt-4 text-lg text-[#385777]">
            Sign in to manage your store inventory and insights.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSigningIn}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-[15px] bg-[#10182d] text-lg font-bold text-white transition hover:bg-[#18223d] disabled:cursor-wait disabled:opacity-60"
        >
          <span className="text-xl font-bold">G</span>
          <span>{isSigningIn ? "Signing in..." : "Continue With Google"}</span>
        </button>
      </div>
    </main>
  );
}
