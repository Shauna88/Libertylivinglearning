import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { getUserByEmail, logAudit } from "./lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await getUserByEmail(email);
        if (!user) return null;
        if (!bcrypt.compareSync(password, user.password_hash)) return null;
        await logAudit({ actorId: user.id, actorName: user.name, action: "auth.login", detail: user.role });
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          region: user.region,
          clientId: user.client_id ?? null,
        };
      },
    }),
  ],
});
