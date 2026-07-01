import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";
import { OVERSIGHT_ROLES, type Role } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, role, region } = session.user;
  const isOversight = OVERSIGHT_ROLES.includes(role as Role);

  return (
    <div className="shell">
      <Sidebar name={name ?? "Staff"} role={role} region={region} isOversight={isOversight} />
      <div className="main">{children}</div>
    </div>
  );
}
