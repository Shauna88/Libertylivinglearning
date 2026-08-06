import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, getClient, addRespite, deleteRespite, type Role } from "@/lib/db";

export const runtime = "nodejs";

const KINDS = ["Respite", "Hospital", "Holiday hold", "Temporary suspension"];

/** Add a respite / short-term-care booking. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const clientId = String(body.clientId ?? "").trim();
  const dateFrom = String(body.dateFrom ?? "").trim();
  const dateTo = String(body.dateTo ?? "").trim();
  if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return NextResponse.json({ error: "Choose a client and valid from/to dates." }, { status: 400 });
  }
  if (dateTo < dateFrom) return NextResponse.json({ error: "The end date is before the start date." }, { status: 400 });
  if (!(await getClient(clientId))) return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : "Respite";

  const row = await addRespite({
    clientId, dateFrom, dateTo, kind,
    location: String(body.location ?? "").trim().slice(0, 160),
    notes: String(body.notes ?? "").trim().slice(0, 500),
    addedBy: session.user.name ?? "Coordinator",
  });
  return NextResponse.json({ ok: true, respite: row });
}

/** Remove a respite booking. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Id required" }, { status: 400 });
  await deleteRespite(id, session.user.name ?? "Coordinator");
  return NextResponse.json({ ok: true });
}
