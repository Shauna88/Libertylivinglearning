"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientCourse } from "@/lib/content";
import { LessonBody, SopStepList } from "@/components/blocks";

type QuizResult = {
  index: number;
  chosen: number;
  answer: number;
  correct: boolean;
  why: string;
};
type SubmitResponse = {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  results: QuizResult[];
  attempt: number;
};

type Page =
  | { kind: "lesson"; i: number }
  | { kind: "sop" }
  | { kind: "quiz" };

export default function CoursePlayer({
  course,
  enrolled,
  priorBest,
  priorPassed,
}: {
  course: ClientCourse;
  enrolled: boolean;
  priorBest: number | null;
  priorPassed: boolean;
}) {
  const router = useRouter();

  const pages = useMemo<Page[]>(() => {
    const p: Page[] = course.lessons.map((_, i) => ({ kind: "lesson", i }));
    if (course.sops.length > 0) p.push({ kind: "sop" });
    p.push({ kind: "quiz" });
    return p;
  }, [course]);

  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => course.quiz.map(() => -1));
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const current = pages[page];
  const progress = Math.round(((page + 1) / pages.length) * 100);
  const allAnswered = answers.every((a) => a >= 0);

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not record completion.");
        return;
      }
      setResult(data as SubmitResponse);
      router.refresh(); // refresh dashboard/monitor data
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    setResult(null);
    setAnswers(course.quiz.map(() => -1));
  }

  return (
    <div className="player">
      <div className="player-progress noprint">
        <div className="bar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
          {page + 1}/{pages.length}
        </span>
      </div>

      {current.kind === "lesson" && (
        <div className="fade" key={`l${current.i}`}>
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{course.lessons[current.i].t}</h2>
          <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
            Lesson {current.i + 1} of {course.lessons.length}
          </div>
          <LessonBody lesson={course.lessons[current.i]} />
        </div>
      )}

      {current.kind === "sop" && (
        <div className="fade" key="sop">
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>The procedure — linked SOPs</h2>
          <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
            Follow these Standard Operating Procedure steps exactly. Each step names who is responsible and the timeframe.
          </div>
          {course.sops.map((s) => (
            <div className="card" key={s.id} style={{ marginBottom: 16 }}>
              <div className="flex" style={{ gap: 8, marginBottom: 6 }}>
                <span className="code">{s.id}</span>
                <strong style={{ fontSize: 15 }}>{s.title}</strong>
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
                {s.purpose}
              </p>
              <SopStepList steps={s.steps} />
            </div>
          ))}
        </div>
      )}

      {current.kind === "quiz" && (
        <div className="fade" key="quiz">
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Knowledge check</h2>
          <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
            Pass mark {course.passMark}%. Scored on the server — your result is recorded against your account.
          </div>

          {result && (
            <div className={`result ${result.passed ? "pass" : "fail"}`}>
              <div className="big">{result.score}%</div>
              <div style={{ fontWeight: 700 }}>
                {result.passed ? "Passed — completion recorded" : "Not yet — review and retake"}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>
                {result.correctCount} of {result.total} correct · attempt {result.attempt}
              </div>
              {result.passed && (
                <Link
                  href={`/certificate/${course.id}`}
                  className="btn"
                  style={{ marginTop: 12, background: "#fff" }}
                >
                  <span className="ms" style={{ fontSize: 17 }}>
                    workspace_premium
                  </span>
                  View certificate
                </Link>
              )}
            </div>
          )}

          {course.quiz.map((q, qi) => {
            const r = result?.results[qi];
            return (
              <div className="quiz-q" key={qi}>
                <h4>
                  {qi + 1}. {q.q}
                </h4>
                {q.o.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  let cls = "opt";
                  if (result && r) {
                    if (oi === r.answer) cls += " correct";
                    else if (oi === r.chosen) cls += " wrong";
                  } else if (selected) {
                    cls += " sel";
                  }
                  return (
                    <button
                      type="button"
                      key={oi}
                      className={cls}
                      disabled={!!result}
                      onClick={() =>
                        setAnswers((prev) => {
                          const next = [...prev];
                          next[qi] = oi;
                          return next;
                        })
                      }
                    >
                      <span className="dot" />
                      <span>{opt}</span>
                    </button>
                  );
                })}
                {result && r && <div className="rationale">{r.why}</div>}
              </div>
            );
          })}

          {err && <div className="error">{err}</div>}
          {!enrolled && !result && (
            <div className="callout" style={{ background: "var(--blue-bg)", borderLeftColor: "var(--blue-fg)" }}>
              <span className="k" style={{ color: "var(--blue-fg)" }}>
                Not on your pathway
              </span>
              This course isn&apos;t assigned to you, so a completion can&apos;t be recorded. You can still read it for
              reference.
            </div>
          )}

          {!result ? (
            <button
              className="btn btn-primary"
              disabled={!allAnswered || busy || !enrolled}
              onClick={submit}
            >
              {busy ? "Submitting…" : `Submit knowledge check`}
            </button>
          ) : !result.passed ? (
            <button className="btn btn-primary" onClick={retake}>
              Retake
            </button>
          ) : null}
        </div>
      )}

      {/* pager */}
      <div className="flex between noprint" style={{ marginTop: 24 }}>
        <button className="btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          <span className="ms" style={{ fontSize: 17 }}>
            arrow_back
          </span>
          Back
        </button>
        {page < pages.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}>
            Next
            <span className="ms" style={{ fontSize: 17 }}>
              arrow_forward
            </span>
          </button>
        ) : (
          <Link className="btn" href="/training">
            Back to hub
          </Link>
        )}
      </div>

      {priorPassed && !result && (
        <div className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          You previously passed this course (best score {priorBest}%). Retaking will record a new attempt.
        </div>
      )}
    </div>
  );
}
