import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, medAdminReport, type Role } from "@/lib/db";
import { MED_STATUS, isMedStatus } from "@/lib/meds";

export const runtime = "nodejs";

const esc = (v: string | number) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const row = (cells: (string | number)[]) => cells.map(esc).join(",");

/** Medication administration report (CSV) over a date range (default last 7 days). */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const url = new URL(req.url);
  const today = new Date();
  const toIso = today.toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const fromDefault = new Date(today.getTime() - 6 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const from = url.searchParams.get("from") || fromDefault;
  const to = url.searchParams.get("to") || toIso;
  const clientId = url.searchParams.get("id") || undefined;

  const rows = await medAdminReport(from, to, clientId);
  const lines = [row(["Date", "Time", "Client", "Medication", "Dose", "Outcome", "Reason", "Recorded by", "Recorded at"])];
  for (const r of rows) {
    const label = isMedStatus(r.status) ? MED_STATUS[r.status].label : r.status;
    lines.push(row([r.service_date, r.sched_time, r.su ?? r.client_id, r.med_name, r.dose, label, r.reason, r.by_name, new Date(r.recorded_at).toISOString()]));
  }
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="medication-administration-${from}_to_${to}.csv"`, "Cache-Control": "no-store" },
  });
}
