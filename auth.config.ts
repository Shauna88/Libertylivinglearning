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
      if (!isLoggedIn) return false;
      // The shareable team-demo login is confined to its curated tour — any other
      // page (reached by typing a URL) bounces back to the demo dashboard.
      if ((auth!.user as { role?: string }).role === "Demo") {
        const allowed = ["/dashboard", "/demo-guide", "/frontline", "/training", "/sops", "/complaints", "/incidents"];
        const ok = allowed.some((p) => pathname === p || pathname.startsWith(p + "/"));
        if (!ok) return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
        token.region = (user as { region: string }).region;
        token.clientId = (user as { clientId?: string | null }).clientId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.region = token.region as string;
        session.user.clientId = (token.clientId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
