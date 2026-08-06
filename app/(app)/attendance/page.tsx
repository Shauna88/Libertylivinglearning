import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, type Role } from "@/lib/db";
import AttendanceHub from "@/components/AttendanceHub";

export const dynamic = "force-dynamic";

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];

export default async function AttendancePage() {
  const session = await auth();
  if (!CAN_VIEW.includes(session!.user.role as Role)) redirect("/dashboard");

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>punch_clock</span>Attendance &amp; timesheets</span>
        </div>
        <h1>Workforce attendance</h1>
        <p>
          Planned Schedule of Service vs actual point-of-care clock-ins for every carer, any week — the record for payroll, HSE queries and audit. Client names are masked.
        </p>
      </header>
      <div className="body fade">
        <AttendanceHub />
      </div>
    </>
  );
}
