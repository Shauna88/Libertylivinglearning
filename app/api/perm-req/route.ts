import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, createPermReq, decidePermReq, type Role } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Permanent-change requests. A coordinator raises one (`create`); a CSM/manager
 * approves or declines it (`decide`) — approval folds the change into the base
 * Schedule of Service.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: {
    action?: string;
    clientId?: string;
    day?: string;
    time?: string;
    carer?: string;
    note?: string;
    id?: number;
    approve?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = session.user.role as Role;
  const who = session.user.name ?? "Staff";

  if (body.action === "decide") {
    if (!OVERSIGHT_ROLES.includes(role)) {
      return NextResponse.json({ error: "Only a CSM can approve changes" }, { status: 403 });
    }
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "Request id required" }, { status: 400 });
    await decidePermReq(id, !!body.approve, who);
    return NextResponse.json({ ok: true });
  }

  // create
  if (!CRM_ROLES.includes(role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  const clientId = String(body.clientId ?? "");
  const day = String(body.day ?? "");
  const time = String(body.time ?? "");
  const carer = String(body.carer ?? "").trim();
  if (!clientId || !day || !time || !carer) {
    return NextResponse.json({ error: "clientId, day, time and carer are required" }, { status: 400 });
  }
  await createPermReq({ clientId, day, time, carer, note: String(body.note ?? ""), requestedBy: who });
  return NextResponse.json({ ok: true });
}
