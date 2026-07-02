import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { toClientCourse, getCourse, CAT_TONE } from "@/lib/content";
import { enrollmentsForUser, getUserByEmail, isEnrolled } from "@/lib/db";
import CoursePlayer from "@/components/CoursePlayer";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  const clientCourse = toClientCourse(courseId);
  if (!course || !clientCourse) notFound();

  const session = await auth();
  const user = await getUserByEmail(session!.user.email!);
  if (!user) notFound();

  const enrolled = await isEnrolled(user.id, courseId);
  const en = (await enrollmentsForUser(user.id)).find((e) => e.course_id === courseId);
  const tone = CAT_TONE[course.cat] ?? "grey";

  return (
    <>
      <header className="header">
        <div className="flex" style={{ gap: 10, marginBottom: 6 }}>
          <Link href="/training" className="muted flex" style={{ gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            <span className="ms" style={{ fontSize: 16 }}>
              arrow_back
            </span>
            Training Hub
          </Link>
          <span className={`pill tone-${tone}`}>{course.cat}</span>
        </div>
        <h1>{course.title}</h1>
        <p>
          {course.summary} · <span className="code">{course.policy}</span>
        </p>
      </header>
      <div className="body fade">
        <CoursePlayer
          course={clientCourse}
          enrolled={enrolled}
          priorBest={en?.best_score ?? null}
          priorPassed={!!en?.passed}
        />
      </div>
    </>
  );
}
