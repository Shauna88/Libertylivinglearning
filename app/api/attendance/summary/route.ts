import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, type Role } from "@/lib/db";
import { workforceSummary, resolveMonday } from "@/lib/attendanceServer";

export const runtime = "nodejs";

const CAN_VIEW: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];

/** Workforce-wide weekly timesheet: every carer's planned vs delivered + exceptions. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CAN_VIEW.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const now = new Date();
  const monday = resolveMonday(new URL(req.url).searchParams.get("week"), now);
  const summary = await workforceSummary(monday, now);
  return NextResponse.json({ summary });
}
