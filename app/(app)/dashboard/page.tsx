import Link from "next/link";
import { auth } from "@/auth";
import {
  enrollmentsForUser,
  getUserByEmail,
  listHubIssues,
  listClients,
  listCallLog,
  coverMap,
  type Role,
} from "@/lib/db";
import { getCourse, CAT_TONE } from "@/lib/content";
import { profileFor, hubScopeOf, deptOf, hubLabel, type Capability } from "@/lib/roles";
import { PORTALS, portalKey, rag, ragPct, trend, type Metric } from "@/lib/portals";
import { deriveTodayVisits, nowParts, isUnassignedCarer } from "@/lib/schedule";
import { callType } from "@/lib/callevents";
import { computeFinance, money } from "@/lib/finance";

export const dynamic = "force-dynamic";

const AREA_LINKS: { cap: Capability; href: string; icon: string; label: string }[] = [
  { cap: "crm", href: "/clients", icon: "contacts", label: "Client register" },
  { cap: "crm", href: "/roster", icon: "edit_calendar", label: "Rostering" },
  { cap: "crm", href: "/call-log", icon: "phone_missed", label: "Call log" },
  { cap: "improvement", href: "/improvement", icon: "model_training", label: "Improvement & Training" },
  { cap: "oversight", href: "/monitor", icon: "insights", label: "Training monitor" },
  { cap: "workforce", href: "/workforce", icon: "groups", label: "Workforce & Training" },
  { cap: "recruit", href: "/recruitment", icon: "person_search", label: "Recruitment" },
  { cap: "finance", href: "/finance", icon: "account_balance_wallet", label: "Finance" },
  { cap: "oversight", href: "/data-protection", icon: "encrypted", label: "Data protection" },
];

function greeting(hour: number) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Trend({ metric }: { metric: Metric }) {
  const t = trend(metric.value, metric.prev, metric.dir);
  if (t === "flat") return <span className="kpi-trend flat">— held</span>;
  const good = t === "up";
  return (
    <span className={`kpi-trend ${good ? "up" : "down"}`}>
      <span className="ms" style={{ fontSize: 14 }}>{good ? "trending_up" : "trending_down"}</span>
      from {metric.prev}
    </span>
  );
}

function Scorecard({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="scorecard">
      {metrics.map((k) => {
        const tone = rag(k.value, k.target, k.dir);
        return (
          <div key={k.name} className={`kpi-tile tone-edge-${tone}`}>
            <div className="kpi-top">
              <span className="kpi-value" style={{ color: `var(--${tone}-fg)` }}>{k.value}</span>
              <Trend metric={k} />
            </div>
            <div className="kpi-name">{k.name}</div>
            <div className={`bar ${tone === "green" ? "" : tone}`} style={{ marginTop: 8 }}>
              <span style={{ width: `${ragPct(k.value, k.dir)}%` }} />
            </div>
            <div className="kpi-foot">
              <span className="muted">Target {k.target}</span>
              <span className="code">{k.ref}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const user = await getUserByEmail(session!.user.email!);
  if (!user) return null;

  const role = user.role as Role;
  const profile = profileFor(role);
  const firstName = user.name.split(" ")[0] || "there";
  const hour = new Date().toLocaleString("en-IE", { hour: "2-digit", hour12: false, timeZone: "Europe/Dublin" });
  const hi = `${greeting(parseInt(hour, 10) || 9)}, ${firstName}`;

  // Quick links for the areas this role can reach.
  const seen = new Set<string>();
  const links = AREA_LINKS.filter((l) => profile.caps.includes(l.cap) && !seen.has(l.href) && seen.add(l.href));

  // Live department issue inbox (management roles).
  const isMgmt = profile.caps.includes("improvement");
  let openIssues = 0;
  if (isMgmt) {
    const issues = await listHubIssues();
    const dept = deptOf(role);
    const scoped = hubScopeOf(role) === "dept" && dept ? issues.filter((i) => i.dept === dept) : issues;
    openIssues = scoped.filter((i) => i.status === "open").length;
  }

  const portal = portalKey(role) ? PORTALS[portalKey(role)!] : null;
  const isFinanceDir = role === "Director of Finance";
  const isOps = profile.caps.includes("crm") && !portal; // Care Coordinator / On-Call

  const header = (
    <header className="header">
      <h1>{hi}</h1>
      <p>
        {role} · {user.region}
        {profile.remit ? ` — ${profile.remit}` : ""}
      </p>
    </header>
  );

  const inbox = isMgmt && (
    <Link
      href="/improvement"
      className="card dash-inbox"
      style={{ borderLeft: `4px solid var(--${openIssues ? "amber" : "green"}-fg)` }}
    >
      <div>
        <strong style={{ fontSize: 15 }}>{hubLabel(role)}</strong>
        <p className="muted" style={{ margin: "3px 0 0", fontSize: 13 }}>
          {deptOf(role) && hubScopeOf(role) === "dept"
            ? `Issues routed to your department (${deptOf(role)})`
            : "Open complaints, incidents and safeguarding across the service"}
        </p>
      </div>
      <div className="metric" style={{ textAlign: "right" }}>
        <div className="num" style={{ color: `var(--${openIssues ? "amber" : "green"}-fg)` }}>{openIssues}</div>
        <div className="lbl">open to action</div>
      </div>
    </Link>
  );

  const quickLinks = links.length > 0 && (
    <>
      <div className="section-title">Your areas</div>
      <div className="grid cols-4" style={{ marginBottom: 8 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="card dash-link">
            <span className="ms" style={{ fontSize: 22, color: "var(--accent)" }}>{l.icon}</span>
            <strong style={{ fontSize: 13.5 }}>{l.label}</strong>
          </Link>
        ))}
      </div>
    </>
  );

  // ---------- senior scorecard dashboard ----------
  if (portal) {
    return (
      <>
        {header}
        <div className="body fade">
          <div className="card mandate">
            <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>flag</span>
            <p style={{ margin: 0, fontSize: 13.5 }}>{portal.mandate}</p>
          </div>
          {inbox}
          <div className="section-title">Your scorecard · HSE Authorisation Scheme</div>
          <Scorecard metrics={portal.scorecard} />
          {quickLinks}
        </div>
      </>
    );
  }

  // ---------- finance director: live financial summary ----------
  if (isFinanceDir) {
    const clients = await listClients();
    const now = new Date();
    const fin = computeFinance(clients, now.getFullYear(), now.getMonth() + 1);
    const unpaid = fin.invoices.filter((i) => i.status === "Unpaid").length;
    return (
      <>
        {header}
        <div className="body fade">
          <div className="card mandate">
            <span className="ms" style={{ fontSize: 20, color: "var(--accent)" }}>flag</span>
            <p style={{ margin: 0, fontSize: 13.5 }}>{profile.remit} This month ({fin.monthLabel}) at a glance.</p>
          </div>
          <div className="grid cols-4">
            <div className="card metric"><div className="num">{money(fin.billedTotal)}</div><div className="lbl">Billed this month</div></div>
            <div className="card metric"><div className="num">{money(fin.payrollTotal)}</div><div className="lbl">Payroll</div></div>
            <div className="card metric"><div className="num" style={{ color: "var(--green-fg)" }}>{money(fin.margin)}</div><div className="lbl">Margin ({fin.marginPct}%)</div></div>
            <div className="card metric"><div className="num" style={{ color: unpaid ? "var(--amber-fg)" : "var(--green-fg)" }}>{unpaid}</div><div className="lbl">Invoices unpaid</div></div>
          </div>
          <div className="section-title">By funding scheme</div>
          <div className="grid cols-3">
            {fin.pods.map((p) => (
              <div key={p.code} className="card">
                <div className="flex between" style={{ marginBottom: 4 }}>
                  <strong style={{ fontSize: 13.5 }}>{p.name}</strong>
                  <span className="pill tone-grey">{p.clients} clients</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{p.pod} · {p.hours}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{p.billed}</div>
              </div>
            ))}
          </div>
          {quickLinks}
        </div>
      </>
    );
  }

  // ---------- operational "your day" (Care Coordinator / On-Call) ----------
  if (isOps) {
    const [clients, cover, calls] = await Promise.all([listClients(), coverMap(), listCallLog(100)]);
    const now = new Date();
    const { weekday, nowMin } = nowParts(now);
    const visits = deriveTodayVisits(clients, weekday, nowMin, cover);
    const gaps = visits.filter((v) => isUnassignedCarer(v.carer));
    const followUps = calls.filter((c) => callType(c.kind)?.followUp && !c.resolved);
    const active = clients.filter((c) => c.status === "active").length;
    return (
      <>
        {header}
        <div className="body fade">
          <div className="grid cols-4">
            <div className="card metric"><div className="num">{visits.length}</div><div className="lbl">Visits today ({weekday})</div></div>
            <div className="card metric"><div className="num" style={{ color: gaps.length ? "var(--red-fg)" : "var(--green-fg)" }}>{gaps.length}</div><div className="lbl">Gaps to cover</div></div>
            <div className="card metric"><div className="num" style={{ color: followUps.length ? "var(--amber-fg)" : "var(--green-fg)" }}>{followUps.length}</div><div className="lbl">Calls to follow up</div></div>
            <div className="card metric"><div className="num">{active}</div><div className="lbl">Active clients</div></div>
          </div>

          <div className="section-title">Gaps to cover today</div>
          {gaps.length === 0 ? (
            <div className="card muted" style={{ fontSize: 13 }}>Every visit today is covered. <Link href="/roster" style={{ color: "var(--accent-dark)", fontWeight: 700 }}>Open rostering →</Link></div>
          ) : (
            <div className="card" style={{ borderLeft: "4px solid var(--red-fg)" }}>
              {gaps.slice(0, 6).map((v) => (
                <Link key={`${v.clientId}-${v.time}`} href="/roster" className="dash-row">
                  <span className="code">{v.time}</span>
                  <span style={{ fontWeight: 600 }}>{v.type}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{v.su} · {v.area}</span>
                  <span className="pill tone-red" style={{ marginLeft: "auto" }}>To cover</span>
                </Link>
              ))}
              {gaps.length > 6 && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>+{gaps.length - 6} more in rostering</div>}
            </div>
          )}

          {followUps.length > 0 && (
            <>
              <div className="section-title">Calls needing follow-up</div>
              <div className="card" style={{ borderLeft: "4px solid var(--amber-fg)" }}>
                {followUps.slice(0, 5).map((c) => (
                  <Link key={c.id} href="/call-log" className="dash-row">
                    <span className={`pill tone-${callType(c.kind)?.tone ?? "grey"}`}>{callType(c.kind)?.label ?? c.kind}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{c.su ?? ""}{c.carer ? ` · ${c.carer}` : ""}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{c.detail}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {quickLinks}
        </div>
      </>
    );
  }

  // ---------- staff training dashboard (HCA / Office Admin) ----------
  const enrollments = await enrollmentsForUser(user.id);
  const total = enrollments.length;
  const done = enrollments.filter((e) => e.status === "completed").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const barTone = pct >= 90 ? "" : pct >= 70 ? " amber" : " red";

  return (
    <>
      {header}
      <div className="body fade">
        {total > 0 ? (
          <>
            <div className="grid cols-3">
              <div className="card metric">
                <div className="num">{pct}%</div>
                <div className="lbl">Training compliance</div>
                <div className={`bar${barTone}`} style={{ marginTop: 8 }}><span style={{ width: `${pct}%` }} /></div>
              </div>
              <div className="card metric"><div className="num">{done}/{total}</div><div className="lbl">Courses completed</div></div>
              <div className="card metric"><div className="num">{total - done}</div><div className="lbl">Outstanding</div></div>
            </div>
            <div className="section-title">Your qualification pathway</div>
            <div className="grid cols-2">
              {enrollments.map((e) => {
                const course = getCourse(e.course_id);
                if (!course) return null;
                const tone = CAT_TONE[course.cat] ?? "grey";
                const completed = e.status === "completed";
                return (
                  <Link key={e.course_id} href={`/training/${e.course_id}`} className="card" style={{ display: "block" }}>
                    <div className="flex between" style={{ alignItems: "flex-start" }}>
                      <span className={`pill tone-${tone}`}>{course.cat}</span>
                      {completed ? (
                        <span className="pill tone-green"><span className="ms" style={{ fontSize: 14 }}>check_circle</span>{e.best_score ?? ""}%</span>
                      ) : (
                        <span className="pill tone-amber">Assigned</span>
                      )}
                    </div>
                    <h3 style={{ margin: "10px 0 6px", fontSize: 15.5 }}>{course.title}</h3>
                    <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{course.summary}</p>
                    <div className="flex" style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-2)", gap: 12 }}>
                      <span className="flex" style={{ gap: 4 }}><span className="ms" style={{ fontSize: 15 }}>schedule</span>{course.duration}</span>
                      <span className="code">{course.policy.split("·")[0].trim()}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div className="card">
            <strong>Welcome</strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Use the Staff Training Hub to complete your assigned courses.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
