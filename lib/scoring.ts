import { getCourse, PASS_MARK } from "./content";

export type QuizResult = {
  index: number;
  chosen: number;
  answer: number;
  correct: boolean;
  why: string;
};

export type ScoredQuiz = {
  score: number; // percentage 0-100
  passed: boolean;
  correctCount: number;
  total: number;
  results: QuizResult[];
};

/**
 * Authoritative, server-side scoring. The client never sees the answer key and
 * never computes pass/fail — it only submits the chosen option indices.
 */
export function scoreQuiz(courseId: string, answers: unknown): ScoredQuiz | null {
  const course = getCourse(courseId);
  if (!course) return null;
  const quiz = course.quiz;
  const chosen: number[] = Array.isArray(answers)
    ? answers.map((a) => (Number.isInteger(a) ? (a as number) : -1))
    : [];

  const results: QuizResult[] = quiz.map((item, i) => {
    const pick = chosen[i] ?? -1;
    return {
      index: i,
      chosen: pick,
      answer: item.a,
      correct: pick === item.a,
      why: item.why,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const total = quiz.length;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  return {
    score,
    passed: score >= PASS_MARK,
    correctCount,
    total,
    results,
  };
}
