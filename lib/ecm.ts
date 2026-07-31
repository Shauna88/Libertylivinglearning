/**
 * Electronic Call Monitoring (ECM) — the actual state of today's calls from
 * real point-of-care check-in / check-out, versus the planned schedule. In the
 * live product the carer checks in and out on their phone at the door; here the
 * office can record it too. Calls that pass their start time with no check-in
 * raise a missed-visit alert.
 *
 * Pure logic (clock + events passed in) so it's testable and Date-free here.
 */

/** Minutes past the planned start, with no check-in, before a call is "late". */
export const LATE_GRACE_MIN = 15;

export type EcmState =
  | "upcoming" // not due yet
  | "due" // due now / carer should be arriving
  | "late" // past start + grace, no check-in → ALERT
  | "missed" // past planned end, still no check-in → ALERT
  | "onsite" // checked in, not yet out
  | "completed" // checked in and out
  | "suspended" // client paused (hospital / hold)
  | "unassigned"; // no carer to check in

export type VisitEvent = {
  checkinAt: string | null;
  checkoutAt: string | null;
} | null;

export function ecmState(opts: {
  startMin: number;
  endMin: number;
  nowMin: number;
  unassigned: boolean;
  suspended: boolean;
  event: VisitEvent;
}): EcmState {
  const { startMin, endMin, nowMin, unassigned, suspended, event } = opts;
  if (event?.checkoutAt) return "completed";
  if (event?.checkinAt) return "onsite";
  if (suspended) return "suspended";
  if (unassigned) return "unassigned";
  if (nowMin < startMin - 10) return "upcoming";
  if (nowMin < startMin + LATE_GRACE_MIN) return "due";
  if (nowMin < endMin) return "late";
  return "missed";
}

/** A late or missed call needs the office / on-call to act now. */
export function isEcmAlert(s: EcmState): boolean {
  return s === "late" || s === "missed";
}

export const ECM_META: Record<EcmState, { label: string; tone: string }> = {
  upcoming: { label: "Upcoming", tone: "grey" },
  due: { label: "Due now", tone: "blue" },
  late: { label: "No check-in — late", tone: "amber" },
  missed: { label: "Missed — no check-in", tone: "red" },
  onsite: { label: "On site", tone: "green" },
  completed: { label: "Completed", tone: "grey" },
  suspended: { label: "Suspended", tone: "amber" },
  unassigned: { label: "Unassigned", tone: "red" },
};

/** hh:mm local time from an ISO timestamp. */
export function hhmm(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
}

/** Actual delivered minutes from a completed check-in/out pair. */
export function deliveredMinutes(event: { checkinAt: string | null; checkoutAt: string | null } | null): number | null {
  if (!event?.checkinAt || !event?.checkoutAt) return null;
  const ms = new Date(event.checkoutAt).getTime() - new Date(event.checkinAt).getTime();
  return ms > 0 ? Math.round(ms / 60000) : 0;
}
