import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, listClients, coverMap, type Role } from "@/lib/db";
import { unassignedCalls } from "@/lib/schedule";

export const runtime = "nodejs";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const esc = (v: string | number) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const row = (cells: (string | number)[]) => cells.map(esc).join(",");

/** Unassigned appointments export (CSV) — every call with no carer allocated. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const [clients, cover] = await Promise.all([listClients(), coverMap()]);
  const calls = unassignedCalls(clients, cover).sort((a, b) => (WEEK.indexOf(a.day) - WEEK.indexOf(b.day)) || a.time.localeCompare(b.time));

  const lines = [row(["Day", "Time", "Duration", "Visit type", "Client", "Area"])];
  for (const c of calls) lines.push(row([c.day, c.time, c.dur, c.type, `${c.maskedName} · ${c.su}`, c.area]));

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="unassigned-appointments-${today}.csv"`, "Cache-Control": "no-store" },
  });
}
