import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge-safe auth check: uses the JWT session cookie only (no DB).
export default NextAuth(authConfig).auth;

export const config = {
  // Run on pages only. API routes self-guard via auth() so they can return
  // proper JSON status codes instead of HTML redirects.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
