import Link from "next/link";
import { auth } from "@/auth";
import { enrollmentsForUser, getUserByEmail } from "@/lib/db";
import { COURSES, CAT_TONE, type Course } from "@/lib/content";

export default async function TrainingHubPage() {
  const session = await auth();
  const user = getUserByEmail(session!.user.email!);
  if (!user) return null;

  const enrollments = enrollmentsForUser(user.id);
  const statusById = new Map(enrollments.map((e) => [e.course_id, e]));

  // group all courses by category
  const byCat = new Map<string, Array<[string, Course]>>();
  for (const [id, c] of Object.entries(COURSES)) {
    if (!byCat.has(c.cat)) byCat.set(c.cat, []);
    byCat.get(c.cat)!.push([id, c]);
  }

  return (
    <>
      <header className="header">
        <h1>Staff Training Hub</h1>
        <p>
          {Object.keys(COURSES).length} courses across the QMS. Complete lessons, read the linked SOP, then pass the
          knowledge check (70%). Completions are recorded for HSE/HIQA audit.
        </p>
      </header>
      <div className="body fade">
        {[...byCat.entries()].map(([cat, list]) => {
          const tone = CAT_TONE[cat] ?? "grey";
          return (
            <section key={cat}>
              <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`pill tone-${tone}`}>{cat}</span>
              </div>
              <div className="grid cols-2">
                {list.map(([id, course]) => {
                  const en = statusById.get(id);
                  const completed = en?.status === "completed";
                  return (
                    <Link key={id} href={`/training/${id}`} className="card" style={{ display: "block" }}>
                      <div className="flex between" style={{ alignItems: "flex-start" }}>
                        <h3 style={{ margin: 0, fontSize: 15.5, maxWidth: "78%" }}>{course.title}</h3>
                        {completed ? (
                          <span className="pill tone-green">
                            <span className="ms" style={{ fontSize: 14 }}>
                              check_circle
                            </span>
                            {en?.best_score ?? ""}%
                          </span>
                        ) : en ? (
                          <span className="pill tone-amber">Assigned</span>
                        ) : (
                          <span className="pill tone-grey">Optional</span>
                        )}
                      </div>
                      <p className="muted" style={{ fontSize: 12.5, margin: "8px 0 12px" }}>
                        {course.summary}
                      </p>
                      <div className="flex wrap" style={{ fontSize: 11.5, color: "var(--text-2)", gap: 12 }}>
                        <span className="flex" style={{ gap: 4 }}>
                          <span className="ms" style={{ fontSize: 15 }}>
                            menu_book
                          </span>
                          {course.lessons.length} lessons
                        </span>
                        <span className="flex" style={{ gap: 4 }}>
                          <span className="ms" style={{ fontSize: 15 }}>
                            quiz
                          </span>
                          {course.quiz.length} questions
                        </span>
                        <span className="flex" style={{ gap: 4 }}>
                          <span className="ms" style={{ fontSize: 15 }}>
                            schedule
                          </span>
                          {course.duration}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
