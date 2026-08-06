import { redirect } from "next/navigation";
import Link from "next/link";
import Empty from "@/components/Empty";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, listClients, coverMap, visitEventMap, shiftOfferMap, timeOverrideMap, type Role } from "@/lib/db";
import { deriveTodayVisits, nowParts, carerPool } from "@/lib/schedule";
import { ecmState, isEcmAlert, ECM_META, type EcmState } from "@/lib/ecm";
import EcmDispatch, { type DispatchCall, type Lane } from "@/components/EcmDispatch";

export const dynamic = "force-dynamic"; // always reflects "now"

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...OVERSIGHT_ROLES])] as Role[];
const isUn = (c: string) => !c || /unassigned|to be allocated|^tbc$/i.test(c.trim());

/** Minutes-since-midnight (Europe/Dublin) for an ISO timestamp. */
function dublinMin(iso: string | null): number | null {
  if (!iso) return null;
  const s = new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Europe/Dublin", hour12: false, hour: "2-digit", minute: "2-digit" });
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/** Colour a call by live state — planned vs on-site vs completed vs alert. */
function dispatchTone(state: EcmState): string {
  return ({ onsite: "green", completed: "teal", due: "blue", late: "amber", missed: "red", unassigned: "red", suspended: "grey", upcoming: "grey" } as Record<EcmState, string>)[state];
}

export default async function EcmPage() {
  const session = await auth();
  const role = session!.user.role as Role;
  if (!CAN_VIEW.includes(role)) redirect("/dashboard");

  const now = new Date();
  const { weekday, nowMin } = nowParts(now);
  const serviceDate = now.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const [clients, cover, events, offers, timeOv] = await Promise.all([listClients(), coverMap(), visitEventMap(serviceDate), shiftOfferMap(), timeOverrideMap()]);
  const visits = deriveTodayVisits(clients, weekday, nowMin, cover, timeOv);

  const calls: DispatchCall[] = visits.map((v) => {
    const ev = events[`${v.clientId}|${v.baseTime}`];
    const event = ev ? { checkinAt: ev.checkin_at, checkoutAt: ev.checkout_at } : null;
    const unassigned = v.status === "gap";
    const state = ecmState({ startMin: v.startMin, endMin: v.startMin + v.durMin, nowMin, unassigned, suspended: v.status === "suspended", event });
    return {
      clientId: v.clientId, su: v.su, maskedName: v.maskedName, type: v.type, carer: v.carer,
      time: v.time, baseTime: v.baseTime, timeAdjusted: v.timeAdjusted, startMin: v.startMin, durMin: v.durMin,
      checkinMin: dublinMin(ev?.checkin_at ?? null), checkoutMin: dublinMin(ev?.checkout_at ?? null),
      state, stateLabel: ECM_META[state].label, tone: dispatchTone(state),
    };
  });

  // Unassigned calls (drag onto a carer); everything else grouped into carer lanes.
  const unassigned = calls.filter((_, i) => visits[i].status === "gap");
  const laneMap = new Map<string, DispatchCall[]>();
  visits.forEach((v, i) => {
    if (v.status === "gap") return;
    for (const one of String(v.carer).split("+").map((s) => s.trim())) {
      if (!one || isUn(one)) continue;
      if (!laneMap.has(one)) laneMap.set(one, []);
      laneMap.get(one)!.push(calls[i]);
    }
  });
  const lanes: Lane[] = [...laneMap.entries()]
    .map(([carer, cs]) => ({ carer, calls: cs.slice().sort((a, b) => a.startMin - b.startMin) }))
    .sort((a, b) => a.carer.localeCompare(b.carer));

  const states = visits.map((v) =>
    ecmState({ startMin: v.startMin, endMin: v.startMin + v.durMin, nowMin, unassigned: v.status === "gap", suspended: v.status === "suspended", event: events[`${v.clientId}|${v.baseTime}`] ? { checkinAt: events[`${v.clientId}|${v.baseTime}`].checkin_at, checkoutAt: events[`${v.clientId}|${v.baseTime}`].checkout_at } : null })
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
          <span className="pill tone-teal"><span className="ms" style={{ fontSize: 14 }}>sensors</span>Live dispatch board</span>
        </div>
        <h1>Live calls</h1>
        <p>
          {dateLabel} · {timeLabel} — {calls.length} calls today. Carers down the side with each call plotted on the day;
          check calls in and out, and drag an unassigned call onto a carer to allocate it.
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
            {(() => {
              const missed = calls.filter((c) => c.state === "late" || c.state === "missed").sort((a, b) => a.startMin - b.startMin);
              if (missed.length === 0) return null;
              return (
                <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid var(--red-fg)" }}>
                  <div className="flex" style={{ gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span className="ms" style={{ color: "var(--red-fg)" }}>notification_important</span>
                    <strong style={{ fontSize: 13.5 }}>Started with no check-in</strong>
                    <span className="pill tone-red">{missed.length}</span>
                    <span className="muted" style={{ fontSize: 12 }}>— chase the carer or check them in on the board below</span>
                  </div>
                  <div className="grid cols-3" style={{ gap: 8 }}>
                    {missed.map((c) => (
                      <Link key={`${c.clientId}|${c.time}`} href={`/clients/${c.clientId}?tab=schedule`} className="sched-visit" style={{ display: "block", borderLeft: `3px solid var(--${c.tone}-fg)` }}>
                        <div className="flex between" style={{ alignItems: "center" }}>
                          <span className="code">{c.time}</span>
                          <span className="pill tone-red" style={{ fontSize: 10 }}>{nowMin - c.startMin} min overdue</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 3 }}>{c.type}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>{c.maskedName} · {c.su} · {c.carer || "Unassigned"}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}
            <EcmDispatch lanes={lanes} unassigned={unassigned} weekday={weekday} nowMin={nowMin} canAssign={CRM_ROLES.includes(role)} canCapture carers={carerPool(clients)} offers={offers} />
            <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              Carers down the side; each call is a bar that turns green when they check in and teal when completed.
              Unassigned calls sit on top — drag one onto a carer to allocate it for today.
              Need to log a whole missed call? <Link href="/call-log">Open the call log</Link>.
            </p>
          </>
        )}
      </div>
    </>
  );
}
