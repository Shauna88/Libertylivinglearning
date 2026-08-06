import { redirect } from "next/navigation";
import Link from "next/link";
import Empty from "@/components/Empty";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, listClients, coverMap, visitEventMap, type Role } from "@/lib/db";
import { deriveTodayVisits, nowParts } from "@/lib/schedule";
import { ecmState, isEcmAlert, ECM_META } from "@/lib/ecm";
import CallTimeline, { type CallRow } from "@/components/CallTimeline";

export const dynamic = "force-dynamic"; // always reflects "now"

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...OVERSIGHT_ROLES])] as Role[];

/** Minutes-since-midnight (Europe/Dublin) for an ISO timestamp. */
function dublinMin(iso: string | null): number | null {
  if (!iso) return null;
  const s = new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Europe/Dublin", hour12: false, hour: "2-digit", minute: "2-digit" });
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export default async function EcmPage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!CAN_VIEW.includes(role)) redirect("/dashboard");

  const now = new Date();
  const { weekday, nowMin } = nowParts(now);
  const serviceDate = now.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const [clients, cover, events] = await Promise.all([listClients(), coverMap(), visitEventMap(serviceDate)]);
  const visits = deriveTodayVisits(clients, weekday, nowMin, cover);

  const calls: CallRow[] = visits.map((v) => {
    const ev = events[`${v.clientId}|${v.time}`];
    const event = ev ? { checkinAt: ev.checkin_at, checkoutAt: ev.checkout_at } : null;
    const unassigned = v.status === "gap";
    const suspended = v.status === "suspended";
    const state = ecmState({ startMin: v.startMin, endMin: v.startMin + v.durMin, nowMin, unassigned, suspended, event });
    return {
      clientId: v.clientId, su: v.su, maskedName: v.maskedName, carer: v.carer, type: v.type, area: v.area,
      time: v.time, startMin: v.startMin, durMin: v.durMin,
      checkinMin: dublinMin(ev?.checkin_at ?? null), checkoutMin: dublinMin(ev?.checkout_at ?? null),
      state, stateLabel: ECM_META[state].label, tone: ECM_META[state].tone, unassigned,
    };
  });

  const states = visits.map((v) =>
    ecmState({ startMin: v.startMin, endMin: v.startMin + v.durMin, nowMin, unassigned: v.status === "gap", suspended: v.status === "suspended", event: events[`${v.clientId}|${v.time}`] ? { checkinAt: events[`${v.clientId}|${v.time}`].checkin_at, checkoutAt: events[`${v.clientId}|${v.time}`].checkout_at } : null })
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

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>sensors</span>Electronic Call Monitoring</span>
        </div>
        <h1>Live calls · check-in monitor</h1>
        <p>
          {dateLabel} · {timeLabel} — {calls.length} calls today. Actual point-of-care check-in and check-out
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

        {calls.length === 0 ? (
          <Empty icon="event_available" title="No calls scheduled today" hint="Rostered calls appear here as the day’s plan is built." />
        ) : (
          <>
            <div className="flex wrap" style={{ gap: 14, alignItems: "center", marginBottom: 10, fontSize: 11.5 }}>
              <span className="flex" style={{ gap: 6, alignItems: "center" }}>
                <span style={{ width: 22, height: 8, borderRadius: 4, border: "1px dashed var(--grey-fg)", display: "inline-block" }} />
                <span className="muted">Planned window</span>
              </span>
              <span className="flex" style={{ gap: 6, alignItems: "center" }}>
                <span style={{ width: 22, height: 12, borderRadius: 4, background: "var(--green-fg)", display: "inline-block" }} />
                <span className="muted">Actual check-in → out</span>
              </span>
              <span className="flex" style={{ gap: 6, alignItems: "center" }}>
                <span style={{ width: 2, height: 14, background: "var(--red-fg)", display: "inline-block" }} />
                <span className="muted">Now ({timeLabel})</span>
              </span>
            </div>
            <CallTimeline rows={calls} nowMin={nowMin} canCapture />
            <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              Check calls in and out as they happen — a visit note can be added at check-out and shows on the client and carer records.
              A call raises a missed-visit alert once it is 15 minutes past its planned start with no check-in.
              Need to log a whole missed call? <Link href="/call-log">Open the call log</Link>.
            </p>
          </>
        )}
      </div>
    </>
  );
}
