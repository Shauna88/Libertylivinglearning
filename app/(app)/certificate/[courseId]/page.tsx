import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getCourse } from "@/lib/content";
import { getUserByEmail, completionsForUser } from "@/lib/db";
import PrintButton from "@/components/PrintButton";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();

  const session = await auth();
  const user = getUserByEmail(session!.user.email!);
  if (!user) notFound();

  const passed = completionsForUser(user.id)
    .filter((c) => c.course_id === courseId && c.passed)
    .sort((a, b) => b.score - a.score)[0];

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 10 }}>
          <Link href={`/training/${courseId}`} className="muted flex" style={{ gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            <span className="ms" style={{ fontSize: 16 }}>
              arrow_back
            </span>
            Back to course
          </Link>
        </div>
        <h1>Certificate of completion</h1>
      </header>
      <div className="body fade">
        {!passed ? (
          <div className="card">
            <p style={{ margin: 0 }}>
              You haven&apos;t passed <strong>{course.title}</strong> yet. Complete the knowledge check at 70% or above to
              earn your certificate.
            </p>
          </div>
        ) : (
          <>
            <div
              className="card"
              style={{
                maxWidth: 720,
                margin: "0 auto 18px",
                textAlign: "center",
                padding: "40px 36px",
                borderTop: "6px solid var(--accent)",
              }}
            >
              <div className="brand" style={{ justifyContent: "center", padding: "0 0 20px" }}>
                <div className="brand-tile">
                  <span className="ms">eco</span>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div className="brand-name" style={{ color: "var(--deep)" }}>
                    Liberty Living Homecare
                  </div>
                  <div className="brand-sub" style={{ color: "var(--text-2)" }}>
                    Quality Management System
                  </div>
                </div>
              </div>
              <div className="section-title" style={{ margin: "0 0 6px" }}>
                This certifies that
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px" }}>
                {user.name}
              </div>
              <div className="muted" style={{ marginBottom: 22 }}>
                {user.role} · {user.region}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                has successfully completed
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, margin: "6px 0 4px" }}>{course.title}</div>
              <div className="code" style={{ display: "inline-block" }}>
                {course.policy}
              </div>

              <div
                className="flex"
                style={{ justifyContent: "center", gap: 40, marginTop: 26, flexWrap: "wrap" }}
              >
                <div>
                  <div className="metric">
                    <div className="num" style={{ color: "var(--accent-dark)" }}>
                      {passed.score}%
                    </div>
                    <div className="lbl">Assessment score</div>
                  </div>
                </div>
                <div>
                  <div className="metric">
                    <div className="num">{new Date(passed.completed_at + "Z").toLocaleDateString("en-IE")}</div>
                    <div className="lbl">Date completed</div>
                  </div>
                </div>
              </div>

              <div className="muted" style={{ fontSize: 11, marginTop: 26 }}>
                Certificate ID LLH-{courseId.toUpperCase()}-{String(passed.id).padStart(5, "0")} · Verified against the
                Liberty Living training completions register.
              </div>
            </div>
            <div className="flex" style={{ justifyContent: "center" }}>
              <PrintButton />
            </div>
          </>
        )}
      </div>
    </>
  );
}
