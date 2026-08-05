import { redirect } from "next/navigation";
import Empty from "@/components/Empty";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, listClients, coverMap, visitEventMap, type Role } from "@/lib/db";
import { deriveTodayVisits, nowParts } from "@/lib/schedule";
import { ecmState, isEcmAlert } from "@/lib/ecm";
import EcmBoard, { type EcmRow } from "@/components/EcmBoard";

export const dynamic = "force-dynamic"; // always reflects "now"

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...OVERSIGHT_ROLES])] as Role[];

export default async function EcmPage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!CAN_VIEW.includes(role)) redirect("/dashboard");

  const now = new Date();
  const { weekday, nowMin } = nowParts(now);
  const serviceDate = now.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const [clients, cover, events] = await Promise.all([listClients(), coverMap(), visitEventMap(serviceDate)]);
  const visits = deriveTodayVisits(clients, weekday, nowMin, cover);

  const rows: EcmRow[] = visits.map((v) => {
    const ev = events[`${v.clientId}|${v.time}`];
    return {
      clientId: v.clientId,
      su: v.su,
      maskedName: v.maskedName,
      area: v.area,
      time: v.time,
      type: v.type,
      carer: v.carer,
      startMin: v.startMin,
      endMin: v.startMin + v.durMin,
      unassigned: v.status === "gap",
      suspended: v.status === "suspended",
      event: ev ? { checkinAt: ev.checkin_at, checkoutAt: ev.checkout_at, note: ev.note } : null,
    };
  });

  const states = rows.map((r) =>
    ecmState({ startMin: r.startMin, endMin: r.endMin, nowMin, unassigned: r.unassigned, suspended: r.suspended, event: r.event })
  );
  const count = (fn: (s: string) => boolean) => states.filter(fn).length;
  const alerts = states.filter(isEcmAlert).length;

  const tiles = [
    { label: "Missed / late — no check-in", n: alerts, tone: alerts ? "red" : "grey", icon: "notification_important" },
    { label: "On site now", n: count((s) => s === "onsite"), tone: "green", icon: "how_to_reg" },
    { label: "Completed", n: count((s) => s === "completed"), tone: "grey", icon: "task_alt" },
    { label: "Due / upcoming", n: count((s) => s === "due" || s === "upcoming"), tone: "blue", icon: "schedule" },
  ];

  const dateLabel = now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });
  const timeLabel = now.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
  const canControl = CAN_VIEW.includes(role);

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>sensors</span>Electronic Call Monitoring</span>
        </div>
        <h1>Live calls · check-in monitor</h1>
        <p>
          {dateLabel} · {timeLabel} — {rows.length} calls today. Actual point-of-care check-in and check-out
          against the plan; a call with no check-in past its start time raises a missed-visit alert.
        </p>
      </header>
      <div className="body fade">
        <div className="grid cols-4" style={{ marginBottom: 22 }}>
          {tiles.map((t) => (
            <div key={t.label} className="card metric">
              <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                <span className="ms" style={{ fontSize: 18, color: t.tone === "grey" ? "var(--text-2)" : `var(--${t.tone}-fg)` }}>{t.icon}</span>
                <div className="num" style={{ color: t.tone === "grey" ? undefined : `var(--${t.tone}-fg)` }}>{t.n}</div>
              </div>
              <div className="lbl">{t.label}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <Empty icon="event_available" title="No calls scheduled today" hint="Rostered calls appear here as the day’s plan is built." />
        ) : (
          <EcmBoard rows={rows} nowMin={nowMin} canControl={canControl} />
        )}
      </div>
    </>
  );
}
