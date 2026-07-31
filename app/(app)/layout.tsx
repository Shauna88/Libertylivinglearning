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
  serviceVitals,
  type Role,
} from "@/lib/db";
import { hubLabel, hubScopeOf } from "@/lib/roles";
import ServiceStatusBar from "@/components/ServiceStatusBar";

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
  const isDemo = role === "Demo";
  // Front-line staff can raise register entries but don't see the whole register,
  // so they don't get the org-wide open badges either. The team-demo login browses
  // the registers read-only, so it does get the counts.
  const canSeeRegisters = isOversight || isImprovement || isCrm || isDemo;
  const openCounts = canSeeRegisters ? await registerOpenCounts() : {};

  // Shared service-status bar: the same vital signals for every office/department
  // login (front-line, portal and the read-only demo get their own focused views).
  const showVitals = !["Healthcare Assistant", "Demo"].includes(role);
  const vitals = showVitals ? await serviceVitals() : null;
  // The bar only renders when something is actually flagged — reflect that in the
  // shell so the (pinned) bar and the page header don't both claim the top slot.
  const hasAlerts = !!vitals && Object.values(vitals).some((v) => v.n > 0);

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
        isDemo={isDemo}
        canSeeAllRegisters={canSeeRegisters}
        hubLabel={hubLabel(role)}
        openCounts={openCounts}
      />
      <div className={`main${hasAlerts ? " has-svc" : ""}`}>
        {vitals && <ServiceStatusBar vitals={vitals} />}
        {children}
      </div>
    </div>
  );
}
