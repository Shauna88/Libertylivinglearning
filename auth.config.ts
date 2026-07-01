import type { NextAuthConfig } from "next-auth";

/**
 * Base auth config shared by the Node route handler and the (edge) middleware.
 * Deliberately imports NO database code so it stays edge-safe. The Credentials
 * provider with its db-backed `authorize` lives in ./auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname === "/";
      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
        token.region = (user as { region: string }).region;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.region = token.region as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
