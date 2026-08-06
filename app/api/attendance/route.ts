import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, getClient, getCarer, listClients, visitEventsForDates, type Role } from "@/lib/db";
import { carerWeek } from "@/lib/schedule";
import { buildAttendance, weekDatesFrom, mondayOf, parseDurMin, type PlannedVisit } from "@/lib/attendance";

export const runtime = "nodejs";

const CARER_ROLES: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];
const isUn = (c: string) => !c || /unassigned|to be allocated|^tbc$/i.test(c.trim());

/** A week of attendance (planned vs actual) for one client or carer. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const id = String(url.searchParams.get("id") ?? "").trim();
  const weekParam = String(url.searchParams.get("week") ?? "").trim();
  const role = session.user.role as Role;

  if (scope !== "client" && scope !== "carer") return NextResponse.json({ error: "Bad scope" }, { status: 400 });
  if (scope === "client" && !CRM_ROLES.includes(role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  if (scope === "carer" && !CARER_ROLES.includes(role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const now = new Date();
  // Snap any given date to the Monday of its week (accepts a Monday or any weekday).
  const monday = /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? mondayOf(new Date(`${weekParam}T12:00:00Z`)) : mondayOf(now);
  const weekDates = weekDatesFrom(monday);
  const dateFor = Object.fromEntries(weekDates.map((w) => [w.weekday, w.date]));
  const todayIso = now.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });

  const planned: PlannedVisit[] = [];
  if (scope === "client") {
    const client = await getClient(id);
    if (!client) return NextResponse.json({ error: "Unknown client" }, { status: 404 });
    for (const day of client.schedule) {
      const date = dateFor[day.day];
      if (!date) continue;
      for (const v of day.visits) {
        planned.push({ clientId: client.id, weekday: day.day, date, time: v.time, type: v.type, who: isUn(v.carer) ? "Unassigned" : v.carer, plannedMin: parseDurMin(v.dur), unassigned: isUn(v.carer) });
      }
    }
  } else {
    const carer = await getCarer(id);
    if (!carer) return NextResponse.json({ error: "Unknown carer" }, { status: 404 });
    const clients = await listClients();
    for (const day of carerWeek(clients, carer.name, {})) {
      const date = dateFor[day.day];
      if (!date) continue;
      for (const v of day.visits) {
        planned.push({ clientId: v.clientId, weekday: day.day, date, time: v.time, type: v.type, who: `${v.maskedName} · ${v.su}`, plannedMin: parseDurMin(v.dur) });
      }
    }
  }

  const events = await visitEventsForDates(weekDates.map((w) => w.date));
  const actuals: Record<string, { in: string | null; out: string | null }> = {};
  for (const ev of events) actuals[`${ev.client_id}|${ev.service_date}|${ev.sched_time}`] = { in: ev.checkin_at, out: ev.checkout_at };

  const week = buildAttendance(planned, actuals, weekDates, todayIso);
  return NextResponse.json({ week });
}
