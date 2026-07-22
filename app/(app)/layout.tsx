import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";
import { OVERSIGHT_ROLES, CRM_ROLES, FINANCE_ROLES, RECRUIT_ROLES, registerOpenCounts, type Role } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, role, region } = session.user;
  const isOversight = OVERSIGHT_ROLES.includes(role as Role);
  const isCrm = CRM_ROLES.includes(role as Role);
  const isFinance = FINANCE_ROLES.includes(role as Role);
  const isRecruit = RECRUIT_ROLES.includes(role as Role);
  const openCounts = await registerOpenCounts();

  return (
    <div className="shell">
      <Sidebar
        name={name ?? "Staff"}
        role={role}
        region={region}
        isOversight={isOversight}
        isCrm={isCrm}
        isFinance={isFinance}
        isRecruit={isRecruit}
        openCounts={openCounts}
      />
      <div className="main">{children}</div>
    </div>
  );
}
