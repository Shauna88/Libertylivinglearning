/**
 * CRM scheduling logic — derive "today's visits" from each client's weekly
 * schedule template and classify a live status against the current time.
 * Pure functions (time passed in) so they're testable and Date-free here.
 */
import { maskName, type Client } from "@/lib/crm";
import { availableForSlot, type CarerRecord } from "@/lib/carers";

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
  time: string; // effective start time (temporary time tweak applied)
  baseTime: string; // scheduled time on the plan — the stable identity/key
  startMin: number;
  durMin: number;
  type: string;
  carer: string; // effective carer (cover override applied)
  baseCarer: string; // carer on the base Schedule of Service
  overridden: boolean; // a cover override is in effect for this visit
  timeAdjusted: boolean; // a temporary time tweak is in effect for this visit
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
  coverMap: Record<string, string> = {},
  timeOverrides: Record<string, string> = {}
): TodayVisit[] {
  const out: TodayVisit[] = [];
  for (const c of clients) {
    const day = c.schedule.find((d) => d.day === weekday);
    if (!day) continue;
    for (const v of day.visits) {
      const baseTime = v.time;
      const key = visitKey(c.id, weekday, baseTime);
      const baseCarer = v.carer;
      const overridden = Object.prototype.hasOwnProperty.call(coverMap, key);
      const carer = overridden ? coverMap[key] : baseCarer;
      // A temporary time tweak moves the start time for today only; the base
      // time stays the identity key so cover / events / offers still line up.
      const timeAdjusted = Object.prototype.hasOwnProperty.call(timeOverrides, key);
      const effTime = timeAdjusted ? timeOverrides[key] : baseTime;
      const startMin = parseTime(effTime);
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
        time: effTime,
        baseTime,
        startMin,
        durMin,
        type: v.type,
        carer,
        baseCarer,
        overridden,
        timeAdjusted,
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
  timeAdjusted?: boolean; // a temporary time tweak moved this visit's start time
};
export type CarerDay = { day: string; visits: CarerVisit[]; minutes: number };

export type UnassignedCall = {
  clientId: string;
  su: string;
  area: string;
  maskedName: string;
  day: string;
  time: string;
  startMin: number;
  durMin: number;
  dur: string;
  type: string;
};

/**
 * Every call across all clients whose effective carer (base + cover) is
 * unassigned — the calls a coordinator still needs to cover. Optionally
 * restrict to a set of areas (a carer's travel radius).
 */
export function unassignedCalls(
  clients: Client[],
  coverMap: Record<string, string> = {},
  areas?: string[]
): UnassignedCall[] {
  const out: UnassignedCall[] = [];
  const areaSet = areas ? new Set(areas) : null;
  for (const c of clients) {
    if (c.status === "hospital" || c.status === "discharged" || c.status === "deceased") continue;
    if (areaSet && !areaSet.has(c.area)) continue;
    for (const day of c.schedule) {
      for (const v of day.visits) {
        const key = visitKey(c.id, day.day, v.time);
        const overridden = Object.prototype.hasOwnProperty.call(coverMap, key);
        const effective = overridden ? coverMap[key] : v.carer;
        if (!isUnassigned(effective)) continue;
        out.push({
          clientId: c.id,
          su: c.su,
          area: c.area,
          maskedName: maskName(c.name),
          day: day.day,
          time: v.time,
          startMin: parseTime(v.time),
          durMin: parseDur(v.dur),
          dur: v.dur,
          type: v.type,
        });
      }
    }
  }
  return out;
}

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
  coverMap: Record<string, string> = {},
  timeOverrides: Record<string, string> = {}
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
        const timeAdjusted = Object.prototype.hasOwnProperty.call(timeOverrides, key);
        const effTime = timeAdjusted ? timeOverrides[key] : v.time;
        list.push({
          clientId: c.id,
          su: c.su,
          area: c.area,
          maskedName: maskName(c.name),
          day: day.day,
          time: effTime,
          startMin: parseTime(effTime),
          dur: v.dur,
          type: v.type,
          tasks: v.tasks,
          cover: overridden,
          timeAdjusted,
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

/**
 * Weekly totals for one client. `plannedMin` is the scheduled hours; `unassigned`
 * counts calls with no carer and `unassignedMin` their hours (uncovered → not
 * delivered). `deliveredMin` is the covered hours actually going ahead — 0 if the
 * client's service is paused (in hospital / on hold).
 */
export function clientWeekSummary(
  client: Client,
  coverMap: Record<string, string> = {},
  paused = false
): { plannedMin: number; deliveredMin: number; unassigned: number; unassignedMin: number } {
  let plannedMin = 0;
  let unassigned = 0;
  let unassignedMin = 0;
  for (const day of client.schedule) {
    for (const v of day.visits) {
      const dur = parseDur(v.dur);
      plannedMin += dur;
      const key = visitKey(client.id, day.day, v.time);
      const eff = Object.prototype.hasOwnProperty.call(coverMap, key) ? coverMap[key] : v.carer;
      if (isUnassigned(eff)) { unassigned++; unassignedMin += dur; }
    }
  }
  const deliveredMin = paused ? 0 : plannedMin - unassignedMin;
  return { plannedMin, deliveredMin, unassigned, unassignedMin };
}

const WEEK_IDX: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
};

/**
 * Unassigned calls for one client that start within the next `horizonHours`
 * (default 24) from `weekday` + `nowMin`, treating the weekly Schedule of
 * Service as repeating. Returns how many fall in the window and the
 * minutes-until-start of the soonest one — so the register can flag an
 * imminent uncovered call before it becomes a same-day emergency.
 */
export function upcomingUnassignedCalls(
  client: Client,
  coverMap: Record<string, string>,
  weekday: string,
  nowMin: number,
  horizonHours = 24
): { count: number; soonestMin: number | null } {
  if (client.status === "hospital" || client.status === "discharged" || client.status === "deceased")
    return { count: 0, soonestMin: null };
  const today = WEEK_IDX[weekday];
  if (today === undefined) return { count: 0, soonestMin: null };
  const horizon = horizonHours * 60;
  let count = 0;
  let soonest: number | null = null;
  for (const day of client.schedule) {
    const idx = WEEK_IDX[day.day];
    if (idx === undefined) continue;
    const dayOffset = (idx - today + 7) % 7; // 0..6 days ahead (repeating week)
    for (const v of day.visits) {
      const key = visitKey(client.id, day.day, v.time);
      const eff = Object.prototype.hasOwnProperty.call(coverMap, key) ? coverMap[key] : v.carer;
      if (!isUnassigned(eff)) continue;
      let mins = dayOffset * 1440 + parseTime(v.time) - nowMin;
      if (mins < 0) mins += 7 * 1440; // already passed today → next week's occurrence
      if (mins >= 0 && mins < horizon) {
        count++;
        if (soonest === null || mins < soonest) soonest = mins;
      }
    }
  }
  return { count, soonestMin: soonest };
}

export type BusyMap = Map<string, Map<string, { start: number; end: number }[]>>;

/** For every carer, the time intervals they are already booked, by day. */
export function carerBusyMap(clients: Client[], coverMap: Record<string, string> = {}): BusyMap {
  const m: BusyMap = new Map();
  const add = (name: string, day: string, start: number, end: number) => {
    if (!m.has(name)) m.set(name, new Map());
    const days = m.get(name)!;
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push({ start, end });
  };
  for (const c of clients) {
    for (const day of c.schedule) {
      for (const v of day.visits) {
        const key = visitKey(c.id, day.day, v.time);
        const overridden = Object.prototype.hasOwnProperty.call(coverMap, key);
        const effective = overridden ? coverMap[key] : v.carer;
        const start = parseTime(v.time);
        const end = start + parseDur(v.dur);
        for (const one of String(effective).split("+").map((s) => s.trim())) {
          if (one && !isUnassigned(one)) add(one, day.day, start, end);
        }
      }
    }
  }
  return m;
}

export type FreeCarer = { name: string; freeHours: number };

/** A carer's real committed minutes this week, summed from their booked calls. */
export function committedMinutes(busy: BusyMap, name: string): number {
  const days = busy.get(name);
  if (!days) return 0;
  let m = 0;
  for (const ivs of days.values()) for (const iv of ivs) m += iv.end - iv.start;
  return m;
}

/**
 * Carers who (a) cover `area`, (b) are declared-available for the slot's window,
 * and (c) have no booked call overlapping it — the free-and-nearby options for
 * filling an unassigned call. Spare hours are derived from their real booked
 * load (not a hand-typed figure), so ranking never drifts from reality.
 */
export function freeNearbyCarers(
  carers: CarerRecord[],
  busy: BusyMap,
  slot: { area: string; day: string; time: string; dur: string; exclude?: string }
): FreeCarer[] {
  const start = parseTime(slot.time);
  const end = start + parseDur(slot.dur);
  const out: FreeCarer[] = [];
  for (const c of carers) {
    if (c.status !== "active") continue;
    if (c.name === slot.exclude) continue;
    if (!(c.covers.includes(slot.area) || c.homeArea === slot.area)) continue;
    // Respect the declared working pattern when one is set; a carer with no
    // pattern at all falls back to "always considered" so nothing silently
    // disappears from the pool.
    const hasPattern = !!c.availability && Object.keys(c.availability).length > 0;
    if (hasPattern && !availableForSlot(c, slot.day, start, end)) continue;
    const ivs = busy.get(c.name)?.get(slot.day) ?? [];
    const clash = ivs.some((iv) => start < iv.end && end > iv.start);
    if (clash) continue;
    const committedH = Math.round(committedMinutes(busy, c.name) / 60);
    out.push({ name: c.name, freeHours: Math.max(0, c.capacityHours - committedH) });
  }
  return out.sort((a, b) => b.freeHours - a.freeHours);
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

/**
 * The Europe/Dublin calendar date (YYYY-MM-DD) for each weekday of the week
 * containing `now` (Monday-first). Lets a recurring weekly schedule be matched
 * to the dated check-in/out records (visit_events) for the current week.
 */
export function weekDates(now: Date): Record<string, string> {
  const dublinDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const dublinWeekday = (d: Date) => d.toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", weekday: "long" });
  const todayIdx = Math.max(0, WEEK_ORDER.indexOf(dublinWeekday(now)));
  const out: Record<string, string> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + (i - todayIdx) * 86_400_000);
    out[WEEK_ORDER[i]] = dublinDate(d);
  }
  return out;
}
