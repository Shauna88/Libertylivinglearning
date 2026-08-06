/**
 * Weekly attendance / timesheet — the audit & payroll record of what was actually
 * delivered against the plan. Planned visits come from the recurring Schedule of
 * Service; actuals come from dated point-of-care check-in / check-out
 * (visit_events), which are stored permanently, so any past week can be reviewed
 * for payroll, HSE queries or an audit.
 *
 * Pure functions (dates + events passed in) so this is testable and Date-free.
 */

export const ATT_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type AttState = "completed" | "onsite" | "no_show" | "upcoming" | "unassigned";

export type AttVisit = {
  clientId: string;
  weekday: string;
  date: string; // YYYY-MM-DD
  time: string;
  type: string;
  who: string; // client scope → carer name; carer scope → client label
  plannedMin: number;
  checkinAt: string | null;
  checkoutAt: string | null;
  deliveredMin: number | null;
  varianceMin: number | null; // delivered − planned (once completed)
  lateInMin: number | null; // clock-in vs planned start (+late / −early)
  state: AttState;
};

export type AttDay = { weekday: string; date: string; visits: AttVisit[]; plannedMin: number; deliveredMin: number };

export type AttWeek = {
  weekStart: string;
  weekEnd: string;
  days: AttDay[];
  totals: { calls: number; completed: number; onsite: number; noShow: number; upcoming: number; plannedMin: number; deliveredMin: number };
};

/** A planned call for one dated day, before actuals are merged. */
export type PlannedVisit = { clientId: string; weekday: string; date: string; time: string; type: string; who: string; plannedMin: number; unassigned?: boolean };

export function parseDurMin(d: string): number {
  const m = /(\d+)\s*m/.exec(d);
  if (m) return parseInt(m[1], 10);
  const h = /(\d+)\s*h/.exec(d);
  if (h) return parseInt(h[1], 10) * 60;
  const n = parseInt(d, 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function timeToMin(t: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
}

/** minutes-since-midnight (Europe/Dublin) for an ISO timestamp. */
function dublinMin(iso: string | null): number | null {
  if (!iso) return null;
  const s = new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Europe/Dublin", hour12: false, hour: "2-digit", minute: "2-digit" });
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/** The Monday (YYYY-MM-DD, Europe/Dublin) of the week containing `now`. */
export function mondayOf(now: Date): string {
  const weekday = now.toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", weekday: "long" });
  const idx = Math.max(0, ATT_WEEK.indexOf(weekday));
  const monday = new Date(now.getTime() - idx * 86_400_000);
  return monday.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}

/** Shift a Monday date-string by whole weeks. */
export function shiftWeek(mondayIso: string, deltaWeeks: number): string {
  const base = new Date(`${mondayIso}T12:00:00Z`);
  const d = new Date(base.getTime() + deltaWeeks * 7 * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** The seven weekday→date pairs of the week beginning `mondayIso`. */
export function weekDatesFrom(mondayIso: string): { weekday: string; date: string }[] {
  const base = new Date(`${mondayIso}T12:00:00Z`);
  return ATT_WEEK.map((weekday, i) => ({ weekday, date: new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10) }));
}

/**
 * Merge planned calls with their actual check-in/out into a weekly attendance
 * table with per-day and whole-week totals. `actuals` is keyed clientId|date|time.
 * `todayIso` classifies a call with no check-in as a no-show (past) vs upcoming.
 */
export function buildAttendance(
  planned: PlannedVisit[],
  actuals: Record<string, { in: string | null; out: string | null }>,
  weekDates: { weekday: string; date: string }[],
  todayIso: string
): AttWeek {
  const byDate = new Map<string, PlannedVisit[]>();
  for (const p of planned) {
    if (!byDate.has(p.date)) byDate.set(p.date, []);
    byDate.get(p.date)!.push(p);
  }

  const days: AttDay[] = weekDates.map(({ weekday, date }) => {
    const list = (byDate.get(date) ?? []).sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
    const visits: AttVisit[] = list.map((p) => {
      const ev = actuals[`${p.clientId}|${p.date}|${p.time}`] ?? { in: null, out: null };
      const inMin = dublinMin(ev.in);
      const outMin = dublinMin(ev.out);
      const deliveredMin = ev.in && ev.out && outMin != null && inMin != null ? Math.max(0, outMin - inMin) : null;
      let state: AttState;
      if (p.unassigned) state = "unassigned";
      else if (ev.out) state = "completed";
      else if (ev.in) state = "onsite";
      else if (date < todayIso) state = "no_show";
      else state = "upcoming";
      return {
        clientId: p.clientId, weekday, date, time: p.time, type: p.type, who: p.who,
        plannedMin: p.plannedMin, checkinAt: ev.in, checkoutAt: ev.out, deliveredMin,
        varianceMin: deliveredMin != null ? deliveredMin - p.plannedMin : null,
        lateInMin: inMin != null ? inMin - timeToMin(p.time) : null,
        state,
      };
    });
    const plannedMin = visits.reduce((n, v) => n + v.plannedMin, 0);
    const deliveredMin = visits.reduce((n, v) => n + (v.deliveredMin ?? 0), 0);
    return { weekday, date, visits, plannedMin, deliveredMin };
  });

  const all = days.flatMap((d) => d.visits);
  const totals = weekTotals(all);

  return { weekStart: weekDates[0].date, weekEnd: weekDates[6].date, days, totals };
}

export type AttTotals = { calls: number; completed: number; onsite: number; noShow: number; upcoming: number; plannedMin: number; deliveredMin: number };

export function weekTotals(all: AttVisit[]): AttTotals {
  return {
    calls: all.length,
    completed: all.filter((v) => v.state === "completed").length,
    onsite: all.filter((v) => v.state === "onsite").length,
    noShow: all.filter((v) => v.state === "no_show").length,
    upcoming: all.filter((v) => v.state === "upcoming").length,
    plannedMin: all.reduce((n, v) => n + v.plannedMin, 0),
    deliveredMin: all.reduce((n, v) => n + (v.deliveredMin ?? 0), 0),
  };
}

/** How late a clock-in is before it's flagged; how far under plan counts as short. */
export const LATE_IN_FLAG_MIN = 15;
export const SHORT_DELIVERY_RATIO = 0.75;

export type AttException = {
  kind: "no_show" | "late_in" | "under_delivered";
  subject: string; // the other party (carer scope → client; client scope → carer)
  weekday: string;
  date: string;
  time: string;
  detail: string;
};

/** Payroll/audit exceptions in a week: no-shows, late clock-ins, under-delivered calls. */
export function weekExceptions(week: AttWeek): AttException[] {
  const out: AttException[] = [];
  for (const d of week.days) {
    for (const v of d.visits) {
      const base = { subject: v.who, weekday: v.weekday, date: v.date, time: v.time };
      if (v.state === "no_show") {
        out.push({ ...base, kind: "no_show", detail: "No clock-in recorded" });
        continue;
      }
      if (v.lateInMin != null && v.lateInMin > LATE_IN_FLAG_MIN) {
        out.push({ ...base, kind: "late_in", detail: `Clocked in ${v.lateInMin}m late` });
      }
      if (v.state === "completed" && v.deliveredMin != null && v.plannedMin > 0 && v.deliveredMin < v.plannedMin * SHORT_DELIVERY_RATIO) {
        out.push({ ...base, kind: "under_delivered", detail: `Only ${v.deliveredMin}m of ${v.plannedMin}m delivered` });
      }
    }
  }
  return out;
}
