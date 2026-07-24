import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, listCallLog, listClients, type Role } from "@/lib/db";
import { carerPool } from "@/lib/schedule";
import { callType } from "@/lib/callevents";
import CallLogForm from "@/components/CallLogForm";
import CallLogList, { type CallEvent } from "@/components/CallLogList";

export const dynamic = "force-dynamic";

export default async function CallLogPage() {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const [log, clients] = await Promise.all([listCallLog(200), listClients()]);
  const options = clients.map((c) => ({ id: c.id, label: `${c.su} · ${c.area}` }));
  const pool = carerPool(clients);
  const events = log as unknown as CallEvent[];

  const followUps = events.filter((e) => callType(e.kind)?.followUp && !e.resolved);
  const paused = events.filter((e) => callType(e.kind)?.pause && !e.resolved);

  return (
    <>
      <header className="header">
        <h1>Call log</h1>
        <p>
          Missed, cancelled, extra and pause events. {followUps.length} awaiting follow-up
          {paused.length ? ` · ${paused.length} client${paused.length > 1 ? "s" : ""} on pause` : ""}.
        </p>
      </header>
      <div className="body fade">
        <CallLogForm clients={options} carers={pool} />

        {followUps.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 0 }}>
              Needs follow-up · {followUps.length}
            </div>
            <CallLogList events={followUps} />
          </>
        )}

        <div className="section-title">All events</div>
        <CallLogList events={events} />
      </div>
    </>
  );
}
