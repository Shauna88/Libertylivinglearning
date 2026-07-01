import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      region: string;
    } & DefaultSession["user"];
  }
  interface User {
    role: string;
    region: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    region: string;
  }
}
