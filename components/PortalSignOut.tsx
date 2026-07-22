"use client";

import { signOut } from "next-auth/react";

export default function PortalSignOut() {
  return (
    <button className="portal-signout" onClick={() => signOut({ redirectTo: "/login" })}>
      <span className="ms">logout</span>
      <span>Sign out</span>
    </button>
  );
}
