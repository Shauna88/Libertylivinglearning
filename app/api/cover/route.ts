import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CRM_ROLES,
  setCover,
  clearCover,
  getClient,
  createShiftOffer,
  addPortalNotice,
  type Role,
} from "@/lib/db";

export const runtime = "nodejs";

/** The visit type booked at a given day/time, for nicer offer / notice copy. */
async function visitType(clientId: string, day: string, time: string): Promise<{ su: string; type: string; pref: string } | null> {
  const client = await getClient(clientId);
  if (!client) return null;
  const dayObj = client.schedule.find((d) => d.day === day);
  const v = dayObj?.visits.find((x) => x.time === time);
  return { su: client.su, type: v?.type ?? "visit", pref: client.pref || client.su };
}

/** Allocate / reassign / unallocate a visit (cover override). CRM roles only. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: { action?: string; clientId?: string; day?: string; time?: string; carer?: string; reason?: string; push?: boolean };
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
  // A last-minute change (from Live calls / the Day board) pushes the shift to
  // the HCA and a notice to the family portal; routine planning does not.
  const push = body.push === true;

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
    if (push) {
      const info = await visitType(clientId, day, time);
      if (info) {
        await addPortalNotice({
          clientId,
          kind: "change",
          title: `${day} ${time} visit is being re-arranged`,
          body: `We're organising cover for ${info.pref}'s ${info.type.toLowerCase()} on ${day} at ${time}. We'll confirm the carer shortly.`,
          by,
        });
      }
    }
    return NextResponse.json({ ok: true, carer, reason });
  }
  await setCover({ clientId, day, time, carer, reason: null, by });
  let offered = false;
  if (push) {
    const info = await visitType(clientId, day, time);
    if (info) {
      const offer = await createShiftOffer({
        clientId,
        su: info.su,
        day,
        time,
        type: info.type,
        carer,
        kind: "cover",
        offeredBy: by,
      });
      offered = !!offer;
      await addPortalNotice({
        clientId,
        kind: "change",
        title: `${day} ${time} visit — carer update`,
        body: `${info.pref}'s ${info.type.toLowerCase()} on ${day} at ${time} will now be with ${carer}.`,
        by,
      });
    }
  }
  return NextResponse.json({ ok: true, carer, offered });
}
