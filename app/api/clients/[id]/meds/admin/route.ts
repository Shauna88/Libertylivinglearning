import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, medAdminsForDate, type Role } from "@/lib/db";

export const runtime = "nodejs";

/** All medication administrations for a client on a given date. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const { id } = await params;
  const date = String(new URL(req.url).searchParams.get("date") ?? "").trim() || new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
  const admins = await medAdminsForDate(id, date);
  return NextResponse.json({ date, admins });
}
