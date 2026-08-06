import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { CRM_ROLES, WORKFORCE_ROLES, getCarer, getClient, type Role } from "@/lib/db";
import { clientAttendance, carerAttendance, workforceSummary, resolveMonday } from "@/lib/attendanceServer";

export const runtime = "nodejs";

const CARER_ROLES: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];

const hrs = (min: number) => (min / 60).toFixed(2);
const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hour12: false }) : "");
const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const row = (cells: (string | number)[]) => cells.map(esc).join(",");

/** Download a week's timesheet as CSV — for payroll or an HSE query. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const id = String(url.searchParams.get("id") ?? "").trim();
  const role = session.user.role as Role;
  const now = new Date();
  const monday = resolveMonday(url.searchParams.get("week"), now);

  let filename = "timesheet";
  const lines: string[] = [];

  if (scope === "workforce") {
    if (!CARER_ROLES.includes(role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    const s = await workforceSummary(monday, now);
    filename = `timesheet-workforce-${s.weekStart}`;
    lines.push(row(["Week", `${s.weekStart} to ${s.weekEnd}`]));
    lines.push("");
    lines.push(row(["Carer", "Planned hours", "Delivered hours", "Delivered %", "Calls", "Completed", "No clock-in", "Exceptions"]));
    for (const c of s.carers) {
      const pct = c.totals.plannedMin > 0 ? Math.round((c.totals.deliveredMin / c.totals.plannedMin) * 100) : 0;
      lines.push(row([c.name, hrs(c.totals.plannedMin), hrs(c.totals.deliveredMin), `${pct}%`, c.totals.calls, c.totals.completed, c.totals.noShow, c.exceptions]));
    }
  } else if (scope === "client" || scope === "carer") {
    if (scope === "client" && !CRM_ROLES.includes(role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    if (scope === "carer" && !CARER_ROLES.includes(role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
    const week = scope === "client" ? await clientAttendance(id, monday, now) : await carerAttendance(id, monday, now);
    if (!week) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const name = scope === "client" ? (await getClient(id))?.su ?? id : (await getCarer(id))?.name ?? id;
    filename = `timesheet-${name}-${week.weekStart}`.replace(/[^\w.-]+/g, "_");
    const whoHeader = scope === "client" ? "Carer" : "Client";
    lines.push(row([scope === "client" ? "Client" : "Carer", name, "Week", `${week.weekStart} to ${week.weekEnd}`]));
    lines.push("");
    lines.push(row(["Date", "Day", "Planned time", "Planned mins", "Visit", whoHeader, "Clock-in", "Clock-out", "Delivered mins", "Variance mins", "State"]));
    for (const d of week.days) {
      for (const v of d.visits) {
        lines.push(row([v.date, v.weekday, v.time, v.plannedMin, v.type, v.who, hhmm(v.checkinAt), hhmm(v.checkoutAt), v.deliveredMin ?? "", v.varianceMin ?? "", v.state]));
      }
    }
    lines.push("");
    lines.push(row(["Totals", "", "", week.totals.plannedMin, "", "", "", "", week.totals.deliveredMin, "", `${week.totals.completed} completed / ${week.totals.noShow} no clock-in`]));
  } else {
    return NextResponse.json({ error: "Bad scope" }, { status: 400 });
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
