import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, listClients, listCallLog, coverMap, visitEventMap, type Role } from "@/lib/db";
import { deriveTodayVisits, visitSummary, nowParts } from "@/lib/schedule";
import { ecmState, ECM_META } from "@/lib/ecm";
import CallTimeline, { type CallRow } from "@/components/CallTimeline";

export const dynamic = "force-dynamic"; // always reflects "now"

/** Minutes-since-midnight (Europe/Dublin) for an ISO timestamp. */
function dublinMin(iso: string | null): number | null {
  if (!iso) return null;
  const s = new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Europe/Dublin", hour12: false, hour: "2-digit", minute: "2-digit" });
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export default async function LiveMonitorPage() {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const now = new Date();
  const { weekday, nowMin } = nowParts(now);
  const serviceDate = now.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const [clients, cover, events] = await Promise.all([listClients(), coverMap(), visitEventMap(serviceDate)]);
  const visits = deriveTodayVisits(clients, weekday, nowMin, cover);
  const s = visitSummary(visits);
  const callLog = await listCallLog(20);
  const todayCalls = callLog.filter((c) => new Date(c.created_at).toDateString() === now.toDateString());

  // Merge each planned visit with its actual clock-in/out to see both perspectives.
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
      stateLabel: ECM_META[state].label, tone: ECM_META[state].tone, unassigned,
    };
  });
  const onSite = calls.filter((c) => c.checkinMin != null && c.checkoutMin == null && !c.unassigned).length;
  const noClockIn = calls.filter((c) => c.checkinMin == null && !c.unassigned && nowMin > c.startMin + c.durMin).length;

  const dateLabel = now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });
  const timeLabel = now.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });

  const tiles = [
    { label: "Uncovered", n: s.gap, tone: "red" },
    { label: "On site now", n: onSite, tone: "green" },
    { label: "No clock-in", n: noClockIn, tone: noClockIn ? "red" : "grey" },
    { label: "Due / en route", n: s.enroute, tone: "blue" },
    { label: "Upcoming", n: s.upcoming, tone: "grey" },
    { label: "Suspended", n: s.suspended, tone: "amber" },
  ];

  const gaps = visits.filter((v) => v.status === "gap");

  return (
    <>
      <header className="header">
        <h1>Live visit monitor</h1>
        <p>
          {dateLabel} · {timeLabel} — {visits.length} visits scheduled today. States update against the current time.
        </p>
      </header>
      <div className="body fade">
        <div className="grid cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="card metric">
              <div className="num" style={{ color: t.n > 0 ? `var(--${t.tone}-fg)` : undefined }}>
                {t.n}
              </div>
              <div className="lbl">{t.label}</div>
            </div>
          ))}
        </div>

        {gaps.length > 0 && (
          <>
            <div className="section-title" style={{ color: "var(--red-fg)" }}>
              Cover board — {gaps.length} uncovered visit{gaps.length > 1 ? "s" : ""} need action
            </div>
            <div className="grid cols-2">
              {gaps.map((v, i) => (
                <Link key={i} href={`/clients/${v.clientId}`} className="card" style={{ display: "block", borderLeft: "4px solid var(--red-fg)" }}>
                  <div className="flex between">
                    <span className="code">{v.time}</span>
                    <span className="pill tone-red">Uncovered</span>
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{v.type}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {v.maskedName} · {v.su} · {v.area}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="section-title">Live calls · planned vs actual</div>
        <div className="flex wrap" style={{ gap: 14, alignItems: "center", marginBottom: 10, fontSize: 11.5 }}>
          <span className="flex" style={{ gap: 6, alignItems: "center" }}>
            <span style={{ width: 22, height: 8, borderRadius: 4, border: "1px dashed var(--grey-fg)", display: "inline-block" }} />
            <span className="muted">Planned window</span>
          </span>
          <span className="flex" style={{ gap: 6, alignItems: "center" }}>
            <span style={{ width: 22, height: 12, borderRadius: 4, background: "var(--green-fg)", display: "inline-block" }} />
            <span className="muted">Actual clock-in → out</span>
          </span>
          <span className="flex" style={{ gap: 6, alignItems: "center" }}>
            <span style={{ width: 2, height: 14, background: "var(--red-fg)", display: "inline-block" }} />
            <span className="muted">Now ({timeLabel})</span>
          </span>
        </div>
        <CallTimeline rows={calls} nowMin={nowMin} />
        <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
          Each bar is zoomed to its own call. Actual times come from point-of-care check-in / check-out on the{" "}
          <Link href="/ecm">call monitor</Link>. Diary notes are captured at check-out and show on the client and carer records.
        </p>

        {todayCalls.length > 0 && (
          <>
            <div className="section-title">Call events logged today</div>
            <div className="grid" style={{ gap: 10 }}>
              {todayCalls.map((c) => (
                <div key={c.id} className="card">
                  <div className="flex wrap" style={{ gap: 8 }}>
                    <span className={`pill tone-${c.kind === "late" ? "amber" : "red"}`}>{c.kind}</span>
                    {c.su && <span className="code">{c.su}</span>}
                    {c.visit_time && <span className="code">{c.visit_time}</span>}
                    <span className="muted" style={{ fontSize: 12 }}>
                      {c.area} · {c.logged_by}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, margin: "6px 0 0" }}>{c.detail}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <Link href="/call-log" className="btn">
                Open call log
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
