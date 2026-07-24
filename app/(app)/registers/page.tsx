import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listAllRegister, OVERSIGHT_ROLES, IMPROVEMENT_ROLES, CRM_ROLES, type Role } from "@/lib/db";
import MasterLog, { type LogRow } from "@/components/MasterLog";

const CAN_VIEW: Role[] = [...new Set([...OVERSIGHT_ROLES, ...IMPROVEMENT_ROLES, ...CRM_ROLES])] as Role[];

export const dynamic = "force-dynamic";

export default async function MasterLogPage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!CAN_VIEW.includes(role)) redirect("/dashboard");

  const entries = await listAllRegister();
  const rows: LogRow[] = entries.map((e) => ({
    id: e.id,
    kind: e.kind,
    ref: e.ref,
    category: e.category,
    severity: e.severity,
    summary: e.summary,
    status: e.status,
    reporter: e.reporter_name,
    created_at: e.created_at,
  }));

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-grey"><span className="ms" style={{ fontSize: 14 }}>inventory_2</span>Governance master log</span>
        </div>
        <h1>Master log — complaints, incidents &amp; safeguarding</h1>
        <p>Every entry across all three registers in one place. Filter by type or status, then open a register to sign off or complete its regulatory record.</p>
      </header>
      <div className="body fade">
        <MasterLog rows={rows} />
      </div>
    </>
  );
}
