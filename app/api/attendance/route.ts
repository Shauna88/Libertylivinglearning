import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, type Role } from "@/lib/db";
import { clientAttendance, carerAttendance, resolveMonday } from "@/lib/attendanceServer";
import { weekExceptions } from "@/lib/attendance";

export const runtime = "nodejs";

const CARER_ROLES: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];

/** A week of attendance (planned vs actual) for one client or carer. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const id = String(url.searchParams.get("id") ?? "").trim();
  const role = session.user.role as Role;

  if (scope !== "client" && scope !== "carer") return NextResponse.json({ error: "Bad scope" }, { status: 400 });
  if (scope === "client" && !CRM_ROLES.includes(role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  if (scope === "carer" && !CARER_ROLES.includes(role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const now = new Date();
  const monday = resolveMonday(url.searchParams.get("week"), now);
  const week = scope === "client" ? await clientAttendance(id, monday, now) : await carerAttendance(id, monday, now);
  if (!week) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ week, exceptions: weekExceptions(week) });
}
