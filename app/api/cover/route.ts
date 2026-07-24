import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, setCover, clearCover, type Role } from "@/lib/db";

export const runtime = "nodejs";

/** Allocate / reassign / unallocate a visit (cover override). CRM roles only. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: { action?: string; clientId?: string; day?: string; time?: string; carer?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clientId = String(body.clientId ?? "");
  const day = String(body.day ?? "");
  const time = String(body.time ?? "");
  if (!clientId || !day || !time) {
    return NextResponse.json({ error: "clientId, day and time are required" }, { status: 400 });
  }
  const by = session.user.name ?? "Coordinator";

  if (body.action === "clear") {
    await clearCover({ clientId, day, time, by });
    return NextResponse.json({ ok: true, cleared: true });
  }

  const carer = String(body.carer ?? "").trim();
  if (!carer) return NextResponse.json({ error: "A carer is required" }, { status: 400 });
  // Unassigning requires a reason; assigning a real carer clears any reason.
  if (/^unassigned$/i.test(carer)) {
    const reason = String(body.reason ?? "").trim();
    if (reason.length < 3) {
      return NextResponse.json({ error: "Please give a reason for unassigning this call" }, { status: 400 });
    }
    await setCover({ clientId, day, time, carer, reason, by });
    return NextResponse.json({ ok: true, carer, reason });
  }
  await setCover({ clientId, day, time, carer, reason: null, by });
  return NextResponse.json({ ok: true, carer });
}
