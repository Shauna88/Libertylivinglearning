import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { OVERSIGHT_ROLES, listAuditLog, type Role } from "@/lib/db";

export const runtime = "nodejs";

const esc = (v: string | number | null) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const row = (cells: (string | number | null)[]) => cells.map(esc).join(",");

/** Activity Log export (CSV) — the system audit trail. Oversight only. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!OVERSIGHT_ROLES.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const rows = await listAuditLog(5000);
  const lines = [row(["Timestamp", "Actor", "Action", "Target", "Detail"])];
  for (const r of rows) lines.push(row([new Date(r.created_at).toISOString(), r.actor_name, r.action, r.target, r.detail]));

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="activity-log-${today}.csv"`, "Cache-Control": "no-store" },
  });
}
