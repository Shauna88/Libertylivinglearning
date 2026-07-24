/**
 * Common to-do templates offered as a quick-add dropdown, tailored to each
 * department. Choosing one drops it straight into the personal to-do list
 * (where it can be edited or shared with another department).
 */
export const COMMON_TASKS = [
  "Schedule a meeting",
  "Call a client / family",
  "Send a follow-up email",
  "Prepare for a review",
];

export const DEPT_TASKS: Record<string, string[]> = {
  Quality: [
    "Schedule a spot check",
    "Complete a scheduled audit",
    "Review a complaint outcome",
    "Sign off an incident",
    "Update a QIP action",
    "Prepare the governance report",
  ],
  "Care & Operations": [
    "Complete a care-plan review",
    "Schedule a spot check",
    "Confirm the weekly roster",
    "Follow up a missed call",
    "Re-cover an uncovered call",
    "Update a client's schedule",
  ],
  "Client Services": [
    "Approve permanent carer changes",
    "Care-plan review meeting",
    "Schedule carer supervision",
    "Family update call",
    "Review service quality",
    "New client set-up",
  ],
  HR: [
    "Schedule carer supervision",
    "Complete a reference check",
    "Onboard a new carer",
    "Review a time-off request",
    "Plan training refreshers",
    "Update a staff record",
  ],
  Finance: [
    "Send client invoices",
    "Reconcile payroll",
    "Chase an unpaid invoice",
    "Review rate schemes",
    "Month-end close",
  ],
  Executive: [
    "Prepare the board report",
    "Governance meeting",
    "Review KPIs",
    "Sign off a policy",
  ],
  Administration: [
    "File records",
    "Update training records",
    "Order supplies",
    "Minute a meeting",
  ],
};

/** The quick-add task list for a department (dept-specific first, then common). */
export function presetsFor(dept: string): string[] {
  return [...(DEPT_TASKS[dept] ?? []), ...COMMON_TASKS];
}
