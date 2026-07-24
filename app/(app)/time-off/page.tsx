import { auth } from "@/auth";
import { listTimeOff, OVERSIGHT_ROLES, WORKFORCE_ROLES, type Role } from "@/lib/db";
import TimeOff from "@/components/TimeOff";

const APPROVERS: Role[] = [...new Set([...OVERSIGHT_ROLES, ...WORKFORCE_ROLES])] as Role[];

export const dynamic = "force-dynamic";

export default async function TimeOffPage() {
  const session = await auth();
  const role = session!.user.role as Role;
  const userId = Number(session!.user.id);
  const isApprover = APPROVERS.includes(role);

  const [mine, pending] = await Promise.all([
    listTimeOff({ requesterId: userId }),
    isApprover ? listTimeOff({ status: "pending" }) : Promise.resolve([]),
  ]);
  // Approvers shouldn't have to action their own request in the queue.
  const pendingForMe = pending.filter((r) => r.requester_id !== userId);

  return (
    <>
      <header className="header">
        <h1>Time off &amp; holidays</h1>
        <p>Request annual leave or time off and track where it is. {isApprover ? "Approve or decline your team's requests below." : "Your manager is notified and will approve or decline."}</p>
      </header>
      <div className="body fade">
        <TimeOff mine={mine} pending={pendingForMe} isApprover={isApprover} />
      </div>
    </>
  );
}
