import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  OVERSIGHT_ROLES,
  courseCompliance,
  staffCompliance,
  overallCompliance,
  type Role,
} from "@/lib/db";
import { getCourse } from "@/lib/content";

function tone(pct: number) {
  return pct >= 90 ? "green" : pct >= 70 ? "amber" : "red";
}

export default async function MonitorPage() {
  const session = await auth();
  if (!OVERSIGHT_ROLES.includes(session!.user.role as Role)) redirect("/dashboard");

  const overall = overallCompliance();
  const overallPct = overall.assigned ? Math.round((overall.completed / overall.assigned) * 100) : 0;
  const courses = courseCompliance()
    .map((c) => ({
      ...c,
      title: getCourse(c.course_id)?.title ?? c.course_id,
      pct: c.enrolled ? Math.round((c.completed / c.enrolled) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct);
  const staff = staffCompliance().map((s) => ({
    ...s,
    pct: s.assigned ? Math.round((s.completed / s.assigned) * 100) : 0,
  }));

  return (
    <>
      <header className="header">
        <h1>Training Monitor</h1>
        <p>Live completion data from the training register — the auditable evidence base for HSE/HIQA inspection.</p>
      </header>
      <div className="body fade">
        <div className="grid cols-3">
          <div className="card metric">
            <div className="num">{overallPct}%</div>
            <div className="lbl">Overall completion</div>
            <div className={`bar ${tone(overallPct) === "green" ? "" : tone(overallPct)}`} style={{ marginTop: 8 }}>
              <span style={{ width: `${overallPct}%` }} />
            </div>
          </div>
          <div className="card metric">
            <div className="num">{staff.length}</div>
            <div className="lbl">Staff tracked</div>
          </div>
          <div className="card metric">
            <div className="num">
              {overall.completed}/{overall.assigned}
            </div>
            <div className="lbl">Assignments completed</div>
          </div>
        </div>

        <div className="section-title">Completion by course</div>
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Course</th>
                <th style={{ width: 90 }}>Enrolled</th>
                <th style={{ width: 90 }}>Completed</th>
                <th style={{ width: 220 }}>Completion</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.course_id}>
                  <td style={{ fontWeight: 600 }}>{c.title}</td>
                  <td>{c.enrolled}</td>
                  <td>{c.completed}</td>
                  <td>
                    <div className="flex" style={{ gap: 8 }}>
                      <div className={`bar ${tone(c.pct) === "green" ? "" : tone(c.pct)}`} style={{ flex: 1 }}>
                        <span style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className={`pill tone-${tone(c.pct)}`}>{c.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-title">Per-staff compliance</div>
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Role</th>
                <th>Region</th>
                <th style={{ width: 90 }}>Progress</th>
                <th style={{ width: 130 }}>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="muted">{s.role}</td>
                  <td className="muted">{s.region}</td>
                  <td>{s.assigned === 0 ? "—" : `${s.completed}/${s.assigned}`}</td>
                  <td>
                    {s.assigned === 0 ? (
                      <span className="pill tone-grey">Oversight</span>
                    ) : (
                      <span className={`pill tone-${tone(s.pct)}`}>{s.pct}%</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
