import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, WORKFORCE_ROLES, FINANCE_ROLES, type Role } from "@/lib/db";
import ReportsHub from "@/components/ReportsHub";

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...OVERSIGHT_ROLES, ...WORKFORCE_ROLES, ...FINANCE_ROLES])] as Role[];

export default async function ReportsPage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!CAN_VIEW.includes(role)) redirect("/dashboard");

  const caps = {
    finance: [...FINANCE_ROLES, ...OVERSIGHT_ROLES].includes(role),
    oversight: OVERSIGHT_ROLES.includes(role),
  };

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>summarize</span>Reports</span>
        </div>
        <h1>Reports</h1>
        <p>Generate and download the operational reports — rosters, diaries, timesheets, finance and audit. CSV items download a file; the rest open the live view.</p>
      </header>
      <div className="body fade">
        <ReportsHub caps={caps} />
      </div>
    </>
  );
}
