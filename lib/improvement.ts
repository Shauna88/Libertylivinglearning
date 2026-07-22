/**
 * Improvement & Training hub config.
 *
 * A register issue (complaint / incident / safeguarding) has an owning
 * department that can be re-routed. Reviewing an issue produces a sign-off
 * (the auditable "we reviewed and acted" record) that can also push corrective
 * training/SOPs and route the fix to another department's inbox.
 * See PLATFORM.md §5 and the build-3 spec.
 */

export const DEPARTMENTS = [
  "Client Services",
  "Care & Operations",
  "HR",
  "Finance",
  "Quality",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

/** The department that owns each register kind by default (before routing). */
export const DEFAULT_DEPT: Record<string, Department> = {
  complaint: "Client Services",
  incident: "Care & Operations",
  safeguarding: "Quality",
};

export function defaultDept(kind: string): Department {
  return DEFAULT_DEPT[kind] ?? "Quality";
}

export const OUTCOMES = [
  "Resolved — no further action",
  "Resolved — with actions",
  "Upheld",
  "Partially upheld",
  "Not upheld",
  "Escalated",
] as const;

/** Outcomes that close the issue. */
export function outcomeCloses(outcome: string): boolean {
  return /^Resolved|^Not upheld/.test(outcome);
}

export const AUDIENCES = [
  "All Healthcare Assistants",
  "All Care Coordinators",
  "All Client Service Managers",
  "All office staff",
  "Whole service",
] as const;
