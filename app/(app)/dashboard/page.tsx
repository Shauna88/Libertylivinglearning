import Link from "next/link";
import { auth } from "@/auth";
import { enrollmentsForUser, getUserByEmail } from "@/lib/db";
import { getCourse, CAT_TONE } from "@/lib/content";

export default async function DashboardPage() {
  const session = await auth();
  const user = await getUserByEmail(session!.user.email!);
  if (!user) return null;

  const enrollments = await enrollmentsForUser(user.id);
  const total = enrollments.length;
  const done = enrollments.filter((e) => e.status === "completed").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const outstanding = enrollments.filter((e) => e.status !== "completed");

  const barTone = pct >= 90 ? "" : pct >= 70 ? " amber" : " red";

  const firstName = (user.name.split(" ")[0]) || "there";

  return (
    <>
      <header className="header">
        <h1>Welcome back, {firstName}</h1>
        <p>
          {user.role} · {user.region} — your training compliance and assigned pathway.
        </p>
      </header>
      <div className="body fade">
        {total === 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="flex" style={{ gap: 10 }}>
              <span className="ms" style={{ fontSize: 22, color: "var(--accent)" }}>
                insights
              </span>
              <div>
                <strong>Oversight account</strong>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                  You have no assigned training pathway. Head to the{" "}
                  <a href="/monitor" style={{ color: "var(--accent-dark)", fontWeight: 700 }}>
                    Training Monitor
                  </a>{" "}
                  to review team compliance.
                </p>
              </div>
            </div>
          </div>
        )}
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
            <div className="num">{outstanding.length}</div>
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
                      <span className="ms" style={{ fontSize: 14 }}>
                        check_circle
                      </span>
                      {e.best_score ?? ""}%
                    </span>
                  ) : (
                    <span className="pill tone-amber">Assigned</span>
                  )}
                </div>
                <h3 style={{ margin: "10px 0 6px", fontSize: 15.5 }}>{course.title}</h3>
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  {course.summary}
                </p>
                <div className="flex" style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-2)", gap: 12 }}>
                  <span className="flex" style={{ gap: 4 }}>
                    <span className="ms" style={{ fontSize: 15 }}>
                      schedule
                    </span>
                    {course.duration}
                  </span>
                  <span className="code">{course.policy.split("·")[0].trim()}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
