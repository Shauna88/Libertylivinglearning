/**
 * CRM scheduling logic — derive "today's visits" from each client's weekly
 * schedule template and classify a live status against the current time.
 * Pure functions (time passed in) so they're testable and Date-free here.
 */
import { maskName, type Client } from "@/lib/crm";

export type VisitStatus =
  | "upcoming"
  | "enroute"
  | "inprogress"
  | "done"
  | "gap"
  | "suspended";

export type TodayVisit = {
  clientId: string;
  su: string;
  area: string;
  maskedName: string;
  time: string;
  startMin: number;
  durMin: number;
  type: string;
  carer: string;
  tasks: string[];
  status: VisitStatus;
  statusLabel: string;
  tone: string;
};

const STATUS_META: Record<VisitStatus, { label: string; tone: string }> = {
  upcoming: { label: "Upcoming", tone: "grey" },
  enroute: { label: "Due / en route", tone: "blue" },
  inprogress: { label: "In progress", tone: "green" },
  done: { label: "Completed", tone: "grey" },
  gap: { label: "Uncovered", tone: "red" },
  suspended: { label: "Suspended", tone: "amber" },
};

function parseTime(t: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function parseDur(d: string): number {
  const m = /(\d+)\s*m/.exec(d);
  return m ? parseInt(m[1], 10) : 30;
}

function isUnassigned(carer: string): boolean {
  return !carer || /unassigned|to be allocated|^tbc$/i.test(carer.trim());
}

/** Build today's visits across all clients, classified against `nowMin`. */
export function deriveTodayVisits(
  clients: Client[],
  weekday: string,
  nowMin: number
): TodayVisit[] {
  const out: TodayVisit[] = [];
  for (const c of clients) {
    const day = c.schedule.find((d) => d.day === weekday);
    if (!day) continue;
    for (const v of day.visits) {
      const startMin = parseTime(v.time);
      const durMin = parseDur(v.dur);
      const end = startMin + durMin;
      let status: VisitStatus;
      if (c.status === "hospital") status = "suspended";
      else if (isUnassigned(v.carer)) status = nowMin >= startMin ? "gap" : "upcoming";
      else if (nowMin < startMin - 20) status = "upcoming";
      else if (nowMin < startMin) status = "enroute";
      else if (nowMin < end) status = "inprogress";
      else status = "done";
      const meta = STATUS_META[status];
      out.push({
        clientId: c.id,
        su: c.su,
        area: c.area,
        maskedName: maskName(c.name),
        time: v.time,
        startMin,
        durMin,
        type: v.type,
        carer: v.carer,
        tasks: v.tasks,
        status,
        statusLabel: meta.label,
        tone: meta.tone,
      });
    }
  }
  return out.sort((a, b) => a.startMin - b.startMin);
}

export function visitSummary(visits: TodayVisit[]) {
  const by = (s: VisitStatus) => visits.filter((v) => v.status === s).length;
  return {
    total: visits.length,
    gap: by("gap"),
    inprogress: by("inprogress"),
    enroute: by("enroute"),
    upcoming: by("upcoming"),
    done: by("done"),
    suspended: by("suspended"),
  };
}

/** Group visits by carer for the carer roster. */
export function groupByCarer(visits: TodayVisit[]): { carer: string; visits: TodayVisit[] }[] {
  const map = new Map<string, TodayVisit[]>();
  for (const v of visits) {
    const key = isUnassigned(v.carer) ? "Unassigned" : v.carer;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return [...map.entries()]
    .map(([carer, vs]) => ({ carer, visits: vs }))
    .sort((a, b) => (a.carer === "Unassigned" ? -1 : a.carer.localeCompare(b.carer)));
}

/** en-IE weekday name + minutes-since-midnight for a Date. */
export function nowParts(d: Date): { weekday: string; nowMin: number } {
  const weekday = d.toLocaleDateString("en-IE", { weekday: "long" });
  return { weekday, nowMin: d.getHours() * 60 + d.getMinutes() };
}
