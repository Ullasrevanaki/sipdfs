import { signOut } from "@/auth";
import { clearTwoFactorSession } from "@/lib/two-factor-session";

export async function POST() {
  await clearTwoFactorSession();

  await signOut({
    redirectTo: "/login",
  });
}