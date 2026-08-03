/**
 * Effective availability — a carer's *declared* weekly pattern is not the same
 * as being available this week. Approved time-off (annual leave, sick leave)
 * removes them from the roster for the days it covers. These helpers anchor the
 * repeating weekly schedule to the current calendar week and work out who is
 * off, so the planner never offers a carer who is away and can surface the
 * resulting shortage.
 *
 * Pure functions (dates passed in / parsed from strings) so they stay testable.
 */

export const WEEK_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type Absence = {
  name: string;
  fromMs: number;
  toMs: number; // inclusive end-of-day
  kind: "leave" | "sick";
  label: string; // the raw kind text, e.g. "Annual leave"
};

const MS_DAY = 86_400_000;

/**
 * Parse the loose date strings the app stores ("2026-08-04", "12 Aug 2026")
 * into a UTC-midnight epoch, or null if unparseable.
 */
export function parseLooseDate(s: string | null | undefined): number | null {
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3]);
  const t = Date.parse(s.trim());
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** The current week's weekday → UTC-midnight epoch, Monday-first. */
export function weekDates(ref: Date): Record<string, number> {
  // day 0 = Sunday; shift so Monday is the start of the week.
  const dow = (ref.getDay() + 6) % 7; // 0 = Monday
  const monday = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()) - dow * MS_DAY;
  const out: Record<string, number> = {};
  WEEK_ORDER.forEach((day, i) => {
    out[day] = monday + i * MS_DAY;
  });
  return out;
}

/** Classify a time-off kind string into a leave/sick bucket. */
export function absenceKind(kind: string): "leave" | "sick" {
  return /sick/i.test(kind) ? "sick" : "leave";
}

/**
 * Build absences from approved time-off rows. Only approved requests remove a
 * carer from the roster; pending/declined do not.
 */
export function absencesFromTimeOff(
  rows: { requester_name: string; kind: string; date_from: string; date_to: string; status: string }[]
): Absence[] {
  const out: Absence[] = [];
  for (const r of rows) {
    if (r.status !== "approved") continue;
    const fromMs = parseLooseDate(r.date_from);
    const toMs = parseLooseDate(r.date_to);
    if (fromMs === null || toMs === null) continue;
    out.push({ name: r.requester_name, fromMs, toMs: Math.max(fromMs, toMs), kind: absenceKind(r.kind), label: r.kind });
  }
  return out;
}

export type OffInfo = { kind: "leave" | "sick"; label: string; days: string[] };

/**
 * For the current week, which weekdays each carer is off and why. Returns a map
 * carerName → { kind, label, days[] }. When a carer has both leave and sick in
 * the week, sick wins the headline (it's the more urgent signal).
 */
export function offByCarerForWeek(absences: Absence[], week: Record<string, number>): Map<string, OffInfo> {
  const acc = new Map<string, { leaveDays: Set<string>; sickDays: Set<string>; leaveLabel: string; sickLabel: string }>();
  for (const a of absences) {
    for (const day of WEEK_ORDER) {
      const ms = week[day];
      if (ms >= a.fromMs && ms <= a.toMs) {
        if (!acc.has(a.name)) acc.set(a.name, { leaveDays: new Set(), sickDays: new Set(), leaveLabel: "", sickLabel: "" });
        const e = acc.get(a.name)!;
        if (a.kind === "sick") { e.sickDays.add(day); e.sickLabel = a.label; }
        else { e.leaveDays.add(day); e.leaveLabel = a.label; }
      }
    }
  }
  const out = new Map<string, OffInfo>();
  for (const [name, e] of acc) {
    const sick = e.sickDays.size > 0;
    // Include every off day (leave + sick) so the strip greys them all; the
    // headline kind/label is sick when any sick day falls in the week.
    const allDays = new Set([...e.leaveDays, ...e.sickDays]);
    out.set(name, {
      kind: sick ? "sick" : "leave",
      label: sick ? e.sickLabel : e.leaveLabel,
      days: [...allDays].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)),
    });
  }
  return out;
}

/** Is `carer` off on `weekday` this week (per the off map)? */
export function isOffOnDay(off: Map<string, OffInfo>, name: string, weekday: string): boolean {
  return off.get(name)?.days.includes(weekday) ?? false;
}
