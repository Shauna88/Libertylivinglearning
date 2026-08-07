/**
 * Server-side assembly for attendance: turn the recurring Schedule of Service +
 * dated check-in/out records into a week of planned-vs-actual, for one client,
 * one carer, or the whole workforce. Shared by the attendance routes.
 */
import { getClient, getCarer, listClients, listCarers, coverMap, visitEventsForDates } from "./db";
import { carerWeek, nowParts } from "./schedule";
import { presenceMaps, type PresenceLine } from "./presence";
import { buildAttendance, weekDatesFrom, mondayOf, parseDurMin, weekExceptions, weekTotals, type PlannedVisit, type AttWeek, type AttException, type AttTotals } from "./attendance";
import type { Client } from "./crm";

const isUn = (c: string) => !c || /unassigned|to be allocated|^tbc$/i.test(c.trim());

function dublinToday(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}

/** Snap any date-string (or none) to the Monday of its week. */
export function resolveMonday(weekParam: string | null, now: Date): string {
  return weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? mondayOf(new Date(`${weekParam}T12:00:00Z`)) : mondayOf(now);
}

async function actualsFor(dates: string[]): Promise<Record<string, { in: string | null; out: string | null }>> {
  const events = await visitEventsForDates(dates);
  const m: Record<string, { in: string | null; out: string | null }> = {};
  for (const ev of events) m[`${ev.client_id}|${ev.service_date}|${ev.sched_time}`] = { in: ev.checkin_at, out: ev.checkout_at };
  return m;
}

function plannedForClient(client: Client, dateFor: Record<string, string>): PlannedVisit[] {
  const out: PlannedVisit[] = [];
  for (const day of client.schedule) {
    const date = dateFor[day.day];
    if (!date) continue;
    for (const v of day.visits) {
      out.push({ clientId: client.id, weekday: day.day, date, time: v.time, type: v.type, who: isUn(v.carer) ? "Unassigned" : v.carer, plannedMin: parseDurMin(v.dur), unassigned: isUn(v.carer) });
    }
  }
  return out;
}

function plannedForCarer(clients: Client[], carerName: string, dateFor: Record<string, string>): PlannedVisit[] {
  const out: PlannedVisit[] = [];
  for (const day of carerWeek(clients, carerName, {})) {
    const date = dateFor[day.day];
    if (!date) continue;
    for (const v of day.visits) {
      out.push({ clientId: v.clientId, weekday: day.day, date, time: v.time, type: v.type, who: `${v.maskedName} · ${v.su}`, plannedMin: parseDurMin(v.dur) });
    }
  }
  return out;
}

export async function clientAttendance(id: string, monday: string, now: Date): Promise<AttWeek | null> {
  const client = await getClient(id);
  if (!client) return null;
  const weekDates = weekDatesFrom(monday);
  const dateFor = Object.fromEntries(weekDates.map((w) => [w.weekday, w.date]));
  const actuals = await actualsFor(weekDates.map((w) => w.date));
  return buildAttendance(plannedForClient(client, dateFor), actuals, weekDates, dublinToday(now));
}

export async function carerAttendance(id: string, monday: string, now: Date): Promise<AttWeek | null> {
  const carer = await getCarer(id);
  if (!carer) return null;
  const clients = await listClients();
  const weekDates = weekDatesFrom(monday);
  const dateFor = Object.fromEntries(weekDates.map((w) => [w.weekday, w.date]));
  const actuals = await actualsFor(weekDates.map((w) => w.date));
  return buildAttendance(plannedForCarer(clients, carer.name, dateFor), actuals, weekDates, dublinToday(now));
}

export type CarerSummaryRow = {
  carerId: string;
  name: string;
  totals: AttTotals;
  exceptions: number;
  area?: string;
  phone?: string;
  status?: PresenceLine | null; // today's live status, for the name hover-card
};

export type WorkforceSummary = {
  weekStart: string;
  weekEnd: string;
  carers: CarerSummaryRow[];
  totals: AttTotals;
  exceptions: (AttException & { carer: string; carerId: string })[];
};

/** Every active carer's planned-vs-delivered for the week, plus exceptions. */
export async function workforceSummary(monday: string, now: Date): Promise<WorkforceSummary> {
  const [clients, carers] = await Promise.all([listClients(), listCarers()]);
  const weekDates = weekDatesFrom(monday);
  const dateFor = Object.fromEntries(weekDates.map((w) => [w.weekday, w.date]));
  const actuals = await actualsFor(weekDates.map((w) => w.date));
  const today = dublinToday(now);
  // today's live status per carer, for the name hover-cards
  const cover = await coverMap();
  const { weekday, nowMin } = nowParts(now);
  const presence = presenceMaps(clients, cover, weekday, nowMin);

  const rows: CarerSummaryRow[] = [];
  const allExceptions: (AttException & { carer: string; carerId: string })[] = [];
  for (const c of carers) {
    const week = buildAttendance(plannedForCarer(clients, c.name, dateFor), actuals, weekDates, today);
    if (week.totals.calls === 0) continue;
    const exc = weekExceptions(week);
    rows.push({ carerId: c.id, name: c.name, totals: week.totals, exceptions: exc.length, area: c.homeArea, phone: c.phone, status: presence.carer[c.name] ?? null });
    for (const e of exc) allExceptions.push({ ...e, carer: c.name, carerId: c.id });
  }
  rows.sort((a, b) => b.totals.deliveredMin - a.totals.deliveredMin);

  const agg = weekTotals([]); // zeroed
  for (const r of rows) {
    agg.calls += r.totals.calls; agg.completed += r.totals.completed; agg.onsite += r.totals.onsite;
    agg.noShow += r.totals.noShow; agg.upcoming += r.totals.upcoming;
    agg.plannedMin += r.totals.plannedMin; agg.deliveredMin += r.totals.deliveredMin;
  }
  const priority = { no_show: 0, under_delivered: 1, late_in: 2 } as const;
  allExceptions.sort((a, b) => a.date.localeCompare(b.date) || priority[a.kind] - priority[b.kind]);

  return { weekStart: weekDates[0].date, weekEnd: weekDates[6].date, carers: rows, totals: agg, exceptions: allExceptions };
}
