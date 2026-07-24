import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";
import {
  OVERSIGHT_ROLES,
  CRM_ROLES,
  FINANCE_ROLES,
  RECRUIT_ROLES,
  IMPROVEMENT_ROLES,
  WORKFORCE_ROLES,
  PORTAL_ROLE,
  registerOpenCounts,
  type Role,
} from "@/lib/db";
import { hubLabel, hubScopeOf } from "@/lib/roles";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Client/family logins never see the staff shell — send them to their portal.
  if (session.user.role === PORTAL_ROLE) redirect("/portal");

  const { name, role, region } = session.user;
  const isOversight = OVERSIGHT_ROLES.includes(role as Role);
  const isCrm = CRM_ROLES.includes(role as Role);
  const isFinance = FINANCE_ROLES.includes(role as Role);
  const isRecruit = RECRUIT_ROLES.includes(role as Role);
  const isImprovement = IMPROVEMENT_ROLES.includes(role as Role);
  const isWorkforce = WORKFORCE_ROLES.includes(role as Role);
  // Front-line staff can raise register entries but don't see the whole register,
  // so they don't get the org-wide open badges either.
  const canSeeRegisters = isOversight || isImprovement || isCrm;
  const openCounts = canSeeRegisters ? await registerOpenCounts() : {};

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
        isImprovement={isImprovement}
        isWorkforce={isWorkforce}
        isQualityMgmt={hubScopeOf(role) === "all"}
        canSeeAllRegisters={canSeeRegisters}
        hubLabel={hubLabel(role)}
        openCounts={openCounts}
      />
      <div className="main">{children}</div>
    </div>
  );
}
