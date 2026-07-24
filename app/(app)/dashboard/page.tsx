import Link from "next/link";
import { auth } from "@/auth";
import { enrollmentsForUser, getUserByEmail, listHubIssues, type Role } from "@/lib/db";
import { getCourse, CAT_TONE } from "@/lib/content";
import { profileFor, hubScopeOf, deptOf, hubLabel, type Capability } from "@/lib/roles";

const AREA_LINKS: { cap: Capability; href: string; icon: string; label: string }[] = [
  { cap: "crm", href: "/clients", icon: "contacts", label: "Client register" },
  { cap: "crm", href: "/roster", icon: "edit_calendar", label: "Rostering" },
  { cap: "improvement", href: "/improvement", icon: "model_training", label: "Improvement & Training" },
  { cap: "oversight", href: "/monitor", icon: "insights", label: "Training monitor" },
  { cap: "workforce", href: "/workforce", icon: "groups", label: "Workforce & Training" },
  { cap: "recruit", href: "/recruitment", icon: "person_search", label: "Recruitment" },
  { cap: "finance", href: "/finance", icon: "account_balance_wallet", label: "Finance" },
  { cap: "oversight", href: "/data-protection", icon: "encrypted", label: "Data protection" },
];

export default async function DashboardPage() {
  const session = await auth();
  const user = await getUserByEmail(session!.user.email!);
  if (!user) return null;

  const role = user.role as Role;
  const profile = profileFor(role);
  const firstName = user.name.split(" ")[0] || "there";

  const enrollments = await enrollmentsForUser(user.id);
  const total = enrollments.length;
  const done = enrollments.filter((e) => e.status === "completed").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const barTone = pct >= 90 ? "" : pct >= 70 ? " amber" : " red";

  // Management roles: a department inbox of open issues in their scope.
  const isMgmt = profile.caps.includes("improvement");
  let openIssues = 0;
  if (isMgmt) {
    const issues = await listHubIssues();
    const dept = deptOf(role);
    const scoped = hubScopeOf(role) === "dept" && dept ? issues.filter((i) => i.dept === dept) : issues;
    openIssues = scoped.filter((i) => i.status === "open").length;
  }

  // Quick links, de-duplicated, for the areas this role can reach.
  const seen = new Set<string>();
  const links = AREA_LINKS.filter((l) => profile.caps.includes(l.cap) && !seen.has(l.href) && seen.add(l.href));

  return (
    <>
      <header className="header">
        <h1>Welcome back, {firstName}</h1>
        <p>
          {role} · {user.region}
          {profile.remit ? ` — ${profile.remit}` : ""}
        </p>
      </header>
      <div className="body fade">
        {/* management overview */}
        {(links.length > 0 || isMgmt) && (
          <>
            {isMgmt && (
              <Link href="/improvement" className="card" style={{ display: "block", marginBottom: 16, borderLeft: `4px solid var(--${openIssues ? "amber" : "green"}-fg)` }}>
                <div className="flex between" style={{ alignItems: "center" }}>
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
                </div>
              </Link>
            )}
            {links.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 0 }}>Your areas</div>
                <div className="grid cols-3" style={{ marginBottom: 8 }}>
                  {links.map((l) => (
                    <Link key={l.href} href={l.href} className="card" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="ms" style={{ fontSize: 22, color: "var(--accent)" }}>{l.icon}</span>
                      <strong style={{ fontSize: 14 }}>{l.label}</strong>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* training pathway (staff with an assigned pathway) */}
        {total > 0 ? (
          <>
            <div className="grid cols-3">
              <div className="card metric">
                <div className="num">{pct}%</div>
                <div className="lbl">Training compliance</div>
                <div className={`bar${barTone}`} style={{ marginTop: 8 }}>
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="card metric">
                <div className="num">{done}/{total}</div>
                <div className="lbl">Courses completed</div>
              </div>
              <div className="card metric">
                <div className="num">{total - done}</div>
                <div className="lbl">Outstanding</div>
              </div>
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
                        <span className="pill tone-green">
                          <span className="ms" style={{ fontSize: 14 }}>check_circle</span>
                          {e.best_score ?? ""}%
                        </span>
                      ) : (
                        <span className="pill tone-amber">Assigned</span>
                      )}
                    </div>
                    <h3 style={{ margin: "10px 0 6px", fontSize: 15.5 }}>{course.title}</h3>
                    <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{course.summary}</p>
                    <div className="flex" style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-2)", gap: 12 }}>
                      <span className="flex" style={{ gap: 4 }}>
                        <span className="ms" style={{ fontSize: 15 }}>schedule</span>
                        {course.duration}
                      </span>
                      <span className="code">{course.policy.split("·")[0].trim()}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          links.length === 0 && (
            <div className="card">
              <strong>Welcome</strong>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                Your dashboard is set up. Use the Staff Training Hub to complete assigned courses.
              </p>
            </div>
          )
        )}
      </div>
    </>
  );
}
