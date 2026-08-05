import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, checkInVisit, checkOutVisit, clearVisitEvent, type Role } from "@/lib/db";

export const runtime = "nodejs";

const CAN_USE: Role[] = [...new Set([...CRM_ROLES, ...OVERSIGHT_ROLES])] as Role[];

/** Today's service date in Europe/Dublin as YYYY-MM-DD. */
function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
}

/** Record a point-of-care check-in / check-out (or undo) for one of today's calls. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CAN_USE.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const clientId = String(body.clientId ?? "").trim();
  const schedTime = String(body.schedTime ?? "").trim();
  const carer = String(body.carer ?? "").trim();
  const note = String(body.note ?? "").trim();
  if (!clientId || !/^\d{1,2}:\d{2}$/.test(schedTime)) {
    return NextResponse.json({ error: "Unknown call" }, { status: 400 });
  }

  const serviceDate = todayIso();
  const by = session.user.name ?? "Office";

  if (action === "checkin") await checkInVisit({ clientId, serviceDate, schedTime, carer, by });
  else if (action === "checkout") await checkOutVisit({ clientId, serviceDate, schedTime, by, note });
  else if (action === "undo") await clearVisitEvent({ clientId, serviceDate, schedTime, by });
  else return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
