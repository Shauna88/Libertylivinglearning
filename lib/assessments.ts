/**
 * Structured client assessments & care-plan review cycles. Each client needs an
 * initial assessment plus periodic risk assessments and a care-plan review; the
 * office must be reminded before each falls due. Pure logic (clock passed in).
 *
 * A stored record existing = the assessment has been done; its `reviewDue`
 * (ISO YYYY-MM-DD, or null for a one-off initial assessment) drives the status.
 */

export type AssessmentItem = {
  key: string;
  label: string;
  short: string;
  /** Review cadence in months (null = one-off, no recurring review). */
  cadenceMonths: number | null;
};

/** The assessments tracked for every active client. */
export const ASSESSMENT_ITEMS: AssessmentItem[] = [
  { key: "initial", label: "Initial needs assessment", short: "Initial assessment", cadenceMonths: null },
  { key: "care_plan_review", label: "Care-plan review", short: "Care-plan review", cadenceMonths: 3 },
  { key: "falls_risk", label: "Falls risk assessment", short: "Falls risk", cadenceMonths: 6 },
  { key: "moving_handling", label: "Moving & handling assessment", short: "Moving & handling", cadenceMonths: 12 },
  { key: "environmental", label: "Home environment / PEEP", short: "Environment / PEEP", cadenceMonths: 12 },
  { key: "medication_risk", label: "Medication management assessment", short: "Medication risk", cadenceMonths: 6 },
  { key: "skin_integrity", label: "Skin integrity assessment", short: "Skin integrity", cadenceMonths: 6 },
  { key: "nutrition", label: "Nutrition (MUST) screen", short: "Nutrition", cadenceMonths: 6 },
];

export const ASSESSMENT_ITEM = Object.fromEntries(ASSESSMENT_ITEMS.map((i) => [i.key, i])) as Record<string, AssessmentItem>;

/** How far ahead a review counts as "due soon" (amber). */
export const REVIEW_WINDOW_DAYS = 30;

export type AssessmentStatus = "in_date" | "due_soon" | "overdue" | "not_done" | "completed";

export type AssessmentState = { status: AssessmentStatus; daysLeft: number | null };

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Classify one assessment from whether it's been done and its next review date. */
export function assessmentStatus(
  hasRecord: boolean,
  reviewDue: string | null | undefined,
  cadenceMonths: number | null,
  now: Date
): AssessmentState {
  if (!hasRecord) return { status: "not_done", daysLeft: null };
  if (cadenceMonths === null || !reviewDue) return { status: "completed", daysLeft: null };
  const due = new Date(reviewDue + "T00:00:00");
  if (isNaN(due.getTime())) return { status: "completed", daysLeft: null };
  const days = Math.round((due.getTime() - startOfDay(now)) / 86_400_000);
  if (days < 0) return { status: "overdue", daysLeft: days };
  if (days <= REVIEW_WINDOW_DAYS) return { status: "due_soon", daysLeft: days };
  return { status: "in_date", daysLeft: days };
}

export function assessmentTone(s: AssessmentStatus): string {
  return s === "in_date" || s === "completed" ? "green" : s === "due_soon" ? "amber" : s === "overdue" ? "red" : "grey";
}

export function assessmentLabel(s: AssessmentStatus): string {
  return s === "in_date" ? "In date" : s === "completed" ? "Done" : s === "due_soon" ? "Due soon" : s === "overdue" ? "Overdue" : "Not done";
}

export function reviewPhrase(st: AssessmentState): string {
  if (st.status === "not_done") return "Not started";
  if (st.status === "completed" || st.daysLeft === null) return "Complete";
  if (st.daysLeft < 0) return `${Math.abs(st.daysLeft)} day${st.daysLeft === -1 ? "" : "s"} overdue`;
  if (st.daysLeft === 0) return "Due today";
  return `due in ${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"}`;
}

export type AssessmentRecord = { itemKey: string; reviewDue: string | null };

export type ClientAssessmentSummary = {
  worst: AssessmentStatus;
  overdue: number;
  dueSoon: number;
  notDone: number;
};

const SEVERITY: Record<AssessmentStatus, number> = { in_date: 0, completed: 0, due_soon: 1, not_done: 2, overdue: 3 };

/** Roll a client's assessments into a headline status + counts. */
export function summariseAssessments(records: AssessmentRecord[], now: Date): ClientAssessmentSummary {
  const held = new Map(records.map((r) => [r.itemKey, r]));
  let worst: AssessmentStatus = "in_date";
  let overdue = 0, dueSoon = 0, notDone = 0;
  for (const item of ASSESSMENT_ITEMS) {
    const r = held.get(item.key);
    const st = assessmentStatus(!!r, r?.reviewDue ?? null, item.cadenceMonths, now).status;
    if (st === "overdue") overdue++;
    else if (st === "due_soon") dueSoon++;
    else if (st === "not_done") notDone++;
    if (SEVERITY[st] > SEVERITY[worst]) worst = st;
  }
  return { worst, overdue, dueSoon, notDone };
}
