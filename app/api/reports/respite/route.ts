import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, listRespite, type Role } from "@/lib/db";

export const runtime = "nodejs";

const esc = (v: string | number) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const row = (cells: (string | number)[]) => cells.map(esc).join(",");

/** Respite / short-term care register (CSV). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const rows = await listRespite();
  const lines = [row(["From", "To", "Client", "Type", "Location", "Notes", "Added by"])];
  for (const r of rows) lines.push(row([r.date_from, r.date_to, r.su ?? r.client_id, r.kind, r.location, r.notes, r.added_by]));

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="respite-register-${today}.csv"`, "Cache-Control": "no-store" },
  });
}
