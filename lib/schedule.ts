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
  day: string;
  time: string;
  startMin: number;
  durMin: number;
  type: string;
  carer: string; // effective carer (cover override applied)
  baseCarer: string; // carer on the base Schedule of Service
  overridden: boolean; // a cover override is in effect for this visit
  tasks: string[];
  status: VisitStatus;
  statusLabel: string;
  tone: string;
};

/** Key identifying one visit slot: clientId|day|time. */
export function visitKey(clientId: string, day: string, time: string): string {
  return `${clientId}|${day}|${time}`;
}

export function isUnassignedCarer(carer: string): boolean {
  return isUnassigned(carer);
}

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

/**
 * Build a day's visits across all clients, classified against `nowMin`.
 * `coverMap` (visitKey → carer) applies cover overrides on top of the base
 * Schedule of Service; an override carer of "Unassigned" explicitly unallocates.
 */
export function deriveTodayVisits(
  clients: Client[],
  weekday: string,
  nowMin: number,
  coverMap: Record<string, string> = {}
): TodayVisit[] {
  const out: TodayVisit[] = [];
  for (const c of clients) {
    const day = c.schedule.find((d) => d.day === weekday);
    if (!day) continue;
    for (const v of day.visits) {
      const key = visitKey(c.id, weekday, v.time);
      const baseCarer = v.carer;
      const overridden = Object.prototype.hasOwnProperty.call(coverMap, key);
      const carer = overridden ? coverMap[key] : baseCarer;
      const startMin = parseTime(v.time);
      const durMin = parseDur(v.dur);
      const end = startMin + durMin;
      let status: VisitStatus;
      if (c.status === "hospital") status = "suspended";
      else if (isUnassigned(carer)) status = nowMin >= startMin ? "gap" : "upcoming";
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
        day: weekday,
        time: v.time,
        startMin,
        durMin,
        type: v.type,
        carer,
        baseCarer,
        overridden,
        tasks: v.tasks,
        status,
        statusLabel: meta.label,
        tone: meta.tone,
      });
    }
  }
  return out.sort((a, b) => a.startMin - b.startMin);
}

/** Group visits by area/pod for the "by area" roster view. */
export function groupByArea(visits: TodayVisit[]): { area: string; visits: TodayVisit[] }[] {
  const map = new Map<string, TodayVisit[]>();
  for (const v of visits) {
    const key = v.area || "Unassigned area";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return [...map.entries()]
    .map(([area, vs]) => ({ area, visits: vs }))
    .sort((a, b) => a.area.localeCompare(b.area));
}

const WEEK_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type CarerVisit = {
  clientId: string;
  su: string;
  area: string;
  maskedName: string;
  day: string;
  time: string;
  startMin: number;
  dur: string;
  type: string;
  tasks: string[];
  cover: boolean; // this visit is theirs only via a cover override (this week)
};
export type CarerDay = { day: string; visits: CarerVisit[]; minutes: number };

/** Does `carer` (which may be an "A + B" pairing) include `name`? */
function carerMatches(carer: string, name: string): boolean {
  if (isUnassigned(carer)) return false;
  const target = name.trim().toLowerCase();
  return String(carer).split("+").map((s) => s.trim().toLowerCase()).includes(target);
}

/**
 * One carer's working week across every client — the base Schedule of Service
 * with cover overrides applied, filtered to the calls they are the effective
 * carer for. `cover: true` marks a call that is theirs this week only.
 */
export function carerWeek(
  clients: Client[],
  carerName: string,
  coverMap: Record<string, string> = {}
): CarerDay[] {
  const byDay = new Map<string, CarerVisit[]>(WEEK_ORDER.map((d) => [d, []]));
  for (const c of clients) {
    for (const day of c.schedule) {
      for (const v of day.visits) {
        const key = visitKey(c.id, day.day, v.time);
        const overridden = Object.prototype.hasOwnProperty.call(coverMap, key);
        const effective = overridden ? coverMap[key] : v.carer;
        if (!carerMatches(effective, carerName)) continue;
        const list = byDay.get(day.day);
        if (!list) continue;
        list.push({
          clientId: c.id,
          su: c.su,
          area: c.area,
          maskedName: maskName(c.name),
          day: day.day,
          time: v.time,
          startMin: parseTime(v.time),
          dur: v.dur,
          type: v.type,
          tasks: v.tasks,
          cover: overridden,
        });
      }
    }
  }
  return WEEK_ORDER.map((day) => {
    const visits = (byDay.get(day) ?? []).sort((a, b) => a.startMin - b.startMin);
    const minutes = visits.reduce((n, v) => n + parseDur(v.dur), 0);
    return { day, visits, minutes };
  });
}

/** The pool of carers a coordinator can allocate from (named carers + relief). */
export function carerPool(clients: Client[]): string[] {
  const set = new Set<string>();
  for (const c of clients) {
    for (const name of c.carers ?? []) {
      // split any combined "A + B" entries into individual carers
      for (const one of String(name).split("+").map((s) => s.trim())) {
        if (one && !isUnassigned(one)) set.add(one);
      }
    }
    for (const d of c.schedule) {
      for (const v of d.visits) {
        for (const one of String(v.carer).split("+").map((s) => s.trim())) {
          if (one && !isUnassigned(one)) set.add(one);
        }
      }
    }
  }
  const names = [...set].sort((a, b) => a.localeCompare(b));
  return [...names, "On-call HCA"];
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
