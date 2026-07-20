/**
 * Content access layer.
 *
 * Loads the QMS training content that was migrated verbatim from the design
 * handoff data modules (training-content.js / training-sops.js) into
 * data/qms-content.json. This module is the single source of truth the seed
 * script reads from, and it also provides "client-safe" projections that strip
 * quiz answers so they are never shipped to the browser.
 */
import raw from "@/data/qms-content.json";

// ---- Content block types (as authored in the prototype) ----
export type Block =
  | { k: "t"; t: string }
  | { k: "l"; items: string[] }
  | { k: "tip"; t: string }
  | { k: "warn"; t: string }
  | { k: "scn"; title: string; situation: string; action: string; why: string }
  | { k: "flow"; steps: string[] };

export type Lesson = { t: string; b: Block[] };
export type QuizItem = { q: string; o: string[]; a: number; why: string };

export type Course = {
  title: string;
  cat: string;
  policy: string;
  duration: string;
  format: string;
  summary: string;
  objectives: string[];
  lessons: Lesson[];
  quiz: QuizItem[];
};

export type PathwayModule = [courseId: string, status: string];
export type Pathway = {
  role: string;
  icon: string;
  people: number;
  focus: string;
  modules: PathwayModule[];
};

export type SopStep = { n: number; action: string; role: string; tf: string };
export type Sop = { id: string; title: string; purpose: string; steps: SopStep[] };

type Bundle = {
  courses: Record<string, Course>;
  pathways: Pathway[];
  sops: Record<string, Sop>;
  staffSample: unknown;
};

const bundle = raw as unknown as Bundle;

export const COURSES: Record<string, Course> = bundle.courses;
export const COURSE_IDS: string[] = Object.keys(bundle.courses);
export const PATHWAYS: Pathway[] = bundle.pathways;
export const SOPS: Record<string, Sop> = bundle.sops;
export const SOP_IDS: string[] = Object.keys(bundle.sops);

export function getCourse(id: string): Course | undefined {
  return COURSES[id];
}

export function getSop(id: string): Sop | undefined {
  return SOPS[id];
}

export function getPathwayByRole(role: string): Pathway | undefined {
  return PATHWAYS.find((p) => p.role === role);
}

/** Extract SOP codes (SOP-001 …) referenced in a course's policy string. */
export function linkedSopCodes(course: Course): string[] {
  const codes = course.policy.match(/SOP-\d+/g) || [];
  return [...new Set(codes)].filter((c) => SOPS[c]);
}

export function linkedSops(course: Course): Sop[] {
  return linkedSopCodes(course)
    .map((c) => SOPS[c])
    .filter(Boolean);
}

// ---- Client-safe projections (never leak the answer key) ----
export type ClientQuizItem = { q: string; o: string[] };
export type ClientCourse = {
  id: string;
  title: string;
  cat: string;
  policy: string;
  duration: string;
  format: string;
  summary: string;
  objectives: string[];
  lessons: Lesson[];
  sops: Sop[];
  quiz: ClientQuizItem[];
  passMark: number;
};

export const PASS_MARK = 70;

export function toClientCourse(id: string): ClientCourse | null {
  const c = COURSES[id];
  if (!c) return null;
  return {
    id,
    title: c.title,
    cat: c.cat,
    policy: c.policy,
    duration: c.duration,
    format: c.format,
    summary: c.summary,
    objectives: c.objectives,
    lessons: c.lessons,
    sops: linkedSops(c),
    quiz: c.quiz.map((q) => ({ q: q.q, o: q.o })),
    passMark: PASS_MARK,
  };
}

/** Category → semantic tone key used by the UI. */
export const CAT_TONE: Record<string, string> = {
  "Care delivery": "green",
  Rights: "teal",
  "Health & safety": "red",
  Operations: "blue",
  Communication: "teal",
  Quality: "amber",
  Safety: "red",
  Information: "teal",
  "On-call": "blue",
  Leadership: "green",
};
