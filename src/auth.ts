import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
  async signIn() {
    return true;
  },

  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
    }

    return token;
  },

  async session({ session, token }) {
    if (session.user) {
      if (token.id) {
        session.user.id = token.id as string;
      }

      if (token.email) {
        session.user.email = token.email;
      }
    }

    return session;
  },
},
  pages: {
    signIn: "/login",
  },

  debug: true,
});