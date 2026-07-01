import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { scoreQuiz } from "@/lib/scoring";
import { recordCompletion, isEnrolled } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Submit a knowledge check. The server scores it, decides pass/fail (>=70%),
 * and writes the auditable completions row. The client is never trusted for
 * scoring or pass/fail.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { courseId?: string; answers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const courseId = String(body.courseId ?? "");
  const userId = Number(session.user.id);

  const scored = scoreQuiz(courseId, body.answers);
  if (!scored) {
    return NextResponse.json({ error: "Unknown course" }, { status: 404 });
  }
  if (!isEnrolled(userId, courseId)) {
    return NextResponse.json({ error: "Not enrolled on this course" }, { status: 403 });
  }

  const record = recordCompletion(userId, courseId, scored.score, scored.passed);

  return NextResponse.json({
    score: scored.score,
    passed: scored.passed,
    correctCount: scored.correctCount,
    total: scored.total,
    results: scored.results,
    attempt: record.attempt_no,
    completedAt: record.completed_at,
  });
}
