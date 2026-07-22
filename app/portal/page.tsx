import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getClient, PORTAL_ROLE } from "@/lib/db";

export const runtime = "nodejs";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Distinct carers named across the week, in first-seen order. */
function carersThisWeek(schedule: { visits: { carer: string }[] }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of schedule) {
    for (const v of d.visits) {
      const c = (v.carer ?? "").trim();
      if (c && !/unassigned|to be allocated|^tbc$/i.test(c) && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
  }
  return out;
}

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== PORTAL_ROLE) redirect("/dashboard");

  const clientId = session.user.clientId;
  const client = clientId ? await getClient(clientId) : undefined;

  if (!client) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
        <h1 style={{ marginTop: 0 }}>Your care details aren&rsquo;t linked yet</h1>
        <p className="muted">
          We couldn&rsquo;t find a care record connected to this login. Please contact your
          coordinator on <strong>057 933 5821</strong> and we&rsquo;ll set it up.
        </p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-IE", { weekday: "long", timeZone: "Europe/Dublin" });
  const byDay = new Map(client.schedule.map((d) => [d.day, d.visits]));
  const carers = carersThisWeek(client.schedule);
  const weeklyVisits = client.schedule.reduce((n, d) => n + d.visits.length, 0);
  const inHospital = client.status === "hospital";

  return (
    <>
      <div className="portal-hero">
        <h1>{client.pref}&rsquo;s care schedule</h1>
        <p className="muted">
          Your weekly home-support visits and the carers who look after you. If anything looks
          wrong, call your coordinator — this page is for viewing only.
        </p>
      </div>

      {inHospital && (
        <div className="card portal-note" style={{ borderColor: "var(--amber-fg)" }}>
          <span className="pill tone-amber">Visits paused</span> Home visits are currently on hold
          while you&rsquo;re in hospital. They&rsquo;ll resume when you&rsquo;re home — your
          coordinator will be in touch.
        </div>
      )}

      {/* care summary */}
      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="card metric">
          <div className="num">{client.hoursWk}</div>
          <div className="lbl">Care each week</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{client.pkg}</div>
        </div>
        <div className="card metric">
          <div className="num">{weeklyVisits}</div>
          <div className="lbl">Visits a week</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Across {client.schedule.filter((d) => d.visits.length).length} days</div>
        </div>
        <div className="card metric">
          <div className="num" style={{ fontSize: 20 }}>{client.csm || "Your coordinator"}</div>
          <div className="lbl">Your coordinator</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Call 057 933 5821</div>
        </div>
      </div>

      {/* assigned carers */}
      <div className="section-title">Your care team</div>
      <div className="card portal-team">
        {carers.length ? (
          carers.map((c) => (
            <div key={c} className="portal-carer">
              <div className="portal-avatar">{c.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</div>
              <span>{c}</span>
            </div>
          ))
        ) : (
          <span className="muted">Your regular carers will appear here once your visits are allocated.</span>
        )}
      </div>

      {/* weekly schedule */}
      <div className="section-title">Your week</div>
      <div className="portal-week">
        {WEEK.map((day) => {
          const visits = byDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <div key={day} className={`card portal-day${isToday ? " is-today" : ""}`}>
              <div className="portal-day-head">
                <strong>{day}</strong>
                {isToday && <span className="pill tone-green">Today</span>}
                <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
                  {visits.length ? `${visits.length} visit${visits.length > 1 ? "s" : ""}` : "No visits"}
                </span>
              </div>
              {visits.length === 0 ? (
                <div className="muted" style={{ fontSize: 13, padding: "6px 0" }}>No scheduled visits.</div>
              ) : (
                visits.map((v, i) => (
                  <div key={i} className="portal-visit">
                    <div className="portal-visit-time">
                      <strong>{v.time}</strong>
                      <span className="muted">{v.dur}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="portal-visit-type">{v.type}</div>
                      <div className="muted" style={{ fontSize: 12.5 }}>
                        Carer: {/unassigned|to be allocated|^tbc$/i.test((v.carer ?? "").trim()) || !v.carer ? "To be confirmed" : v.carer}
                      </div>
                      {v.tasks?.length ? (
                        <div className="portal-tasks">{v.tasks.join(" · ")}</div>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
