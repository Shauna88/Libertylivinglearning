import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, createCallEvent, getClient, type Role } from "@/lib/db";

export const runtime = "nodejs";

const KINDS = ["late", "missed", "noshow", "other"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  const detail = String(body.detail ?? "").trim();
  const clientId = body.clientId ? String(body.clientId) : null;
  const visitTime = body.visitTime ? String(body.visitTime) : null;

  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  if (detail.length < 3) return NextResponse.json({ error: "Detail is required" }, { status: 400 });

  // resolve client context (su/area) if a client was chosen
  let su: string | null = null;
  let area: string | null = null;
  if (clientId) {
    const c = await getClient(clientId);
    if (!c) return NextResponse.json({ error: "Unknown client" }, { status: 404 });
    su = c.su;
    area = c.area;
  }

  const row = await createCallEvent({
    clientId,
    su,
    area,
    visitTime,
    kind,
    detail,
    loggedBy: session.user.name ?? "Staff",
  });
  return NextResponse.json({ ok: true, event: row });
}
