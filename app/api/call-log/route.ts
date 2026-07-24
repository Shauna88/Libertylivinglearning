import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CRM_ROLES,
  createCallEvent,
  setCallResolved,
  deleteCallEvent,
  getClient,
  type Role,
} from "@/lib/db";
import { callType, MISSED_CAUSES } from "@/lib/callevents";

export const runtime = "nodejs";

async function guard() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return { error: NextResponse.json({ error: "Not authorised" }, { status: 403 }) };
  }
  return { session };
}

export async function POST(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  const session = g.session!;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  const type = callType(kind);
  if (!type) return NextResponse.json({ error: "Invalid event type" }, { status: 400 });

  const detail = String(body.detail ?? "").trim();
  if (detail.length < 3) return NextResponse.json({ error: "Please describe what happened" }, { status: 400 });

  const clientId = body.clientId ? String(body.clientId) : null;
  if (!clientId) return NextResponse.json({ error: "Choose the client this relates to" }, { status: 400 });
  const c = await getClient(clientId);
  if (!c) return NextResponse.json({ error: "Unknown client" }, { status: 404 });

  let cause: string | null = null;
  if (kind === "missed") {
    cause = String(body.cause ?? "");
    if (!MISSED_CAUSES.some((m) => m.key === cause)) {
      return NextResponse.json({ error: "Choose a cause for the missed call" }, { status: 400 });
    }
  }

  const row = await createCallEvent({
    clientId,
    su: c.su,
    area: c.area,
    visitTime: body.visitTime ? String(body.visitTime) : null,
    kind,
    cause,
    carer: body.carer ? String(body.carer) : null,
    eventDate: body.eventDate ? String(body.eventDate) : null,
    dateTo: body.dateTo ? String(body.dateTo) : null,
    detail,
    loggedBy: session.user.name ?? "Coordinator",
  });
  return NextResponse.json({ ok: true, event: row });
}

export async function PATCH(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  let body: { id?: number; resolved?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Event id required" }, { status: 400 });
  await setCallResolved(id, !!body.resolved, g.session!.user.name ?? "Coordinator");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  let body: { id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Event id required" }, { status: 400 });
  await deleteCallEvent(id, g.session!.user.name ?? "Coordinator");
  return NextResponse.json({ ok: true });
}
