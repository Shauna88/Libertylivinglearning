import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CRM_ROLES, listClients, listCallLog, coverMap, type Role } from "@/lib/db";
import { deriveTodayVisits, visitSummary, nowParts } from "@/lib/schedule";

export const dynamic = "force-dynamic"; // always reflects "now"

export default async function LiveMonitorPage() {
  const session = await auth();
  if (!CRM_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const clients = await listClients();
  const cover = await coverMap();
  const now = new Date();
  const { weekday, nowMin } = nowParts(now);
  const visits = deriveTodayVisits(clients, weekday, nowMin, cover);
  const s = visitSummary(visits);
  const callLog = await listCallLog(20);
  const todayCalls = callLog.filter((c) => new Date(c.created_at).toDateString() === now.toDateString());

  const dateLabel = now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long" });
  const timeLabel = now.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });

  const tiles = [
    { label: "Uncovered", n: s.gap, tone: "red" },
    { label: "In progress", n: s.inprogress, tone: "green" },
    { label: "Due / en route", n: s.enroute, tone: "blue" },
    { label: "Upcoming", n: s.upcoming, tone: "grey" },
    { label: "Completed", n: s.done, tone: "grey" },
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

        <div className="section-title">Today&apos;s visits</div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Time</th>
                <th>Client</th>
                <th>Visit</th>
                <th>Carer</th>
                <th>Area</th>
                <th style={{ width: 150 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v, i) => (
                <tr key={i}>
                  <td>
                    <span className="code">{v.time}</span>
                  </td>
                  <td>
                    <Link href={`/clients/${v.clientId}`} style={{ fontWeight: 600 }}>
                      {v.maskedName}
                    </Link>
                    <div className="code" style={{ display: "inline-block", marginLeft: 6 }}>
                      {v.su}
                    </div>
                  </td>
                  <td className="muted">{v.type}</td>
                  <td className="muted">{v.carer}</td>
                  <td className="muted">{v.area}</td>
                  <td>
                    <span className={`pill tone-${v.tone}`}>{v.statusLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
