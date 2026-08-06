import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CRM_ROLES,
  setTimeOverride,
  clearTimeOverride,
  coverMap,
  getClient,
  createShiftOffer,
  addPortalNotice,
  type Role,
} from "@/lib/db";
import { isUnassignedCarer } from "@/lib/schedule";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Effective carer + su/type for a visit, applying any cover override. */
async function visitInfo(clientId: string, day: string, time: string) {
  const client = await getClient(clientId);
  if (!client) return null;
  const dayObj = client.schedule.find((d) => d.day === day);
  const v = dayObj?.visits.find((x) => x.time === time);
  if (!v) return null;
  const cover = await coverMap();
  const carer = cover[`${clientId}|${day}|${time}`] ?? v.carer;
  return { su: client.su, pref: client.pref || client.su, type: v.type ?? "visit", carer };
}

/** Temporarily move a visit's start time (that day only). CRM roles only. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: { action?: string; clientId?: string; day?: string; time?: string; newTime?: string; push?: boolean };
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
  const push = body.push === true;

  if (body.action === "clear") {
    await clearTimeOverride({ clientId, day, time, by });
    if (push) {
      const info = await visitInfo(clientId, day, time);
      if (info) {
        await addPortalNotice({
          clientId,
          kind: "change",
          title: `${day} visit time restored`,
          body: `${info.pref}'s ${info.type.toLowerCase()} on ${day} is back to its usual ${time} time.`,
          by,
        });
      }
    }
    return NextResponse.json({ ok: true, cleared: true });
  }

  const newTime = String(body.newTime ?? "").trim();
  if (!TIME_RE.test(newTime)) {
    return NextResponse.json({ error: "Enter a valid new time (HH:MM)" }, { status: 400 });
  }
  if (newTime === time) {
    return NextResponse.json({ error: "That's already the scheduled time" }, { status: 400 });
  }
  await setTimeOverride({ clientId, day, time, newTime, by });

  let offered = false;
  if (push) {
    const info = await visitInfo(clientId, day, time);
    if (info) {
      // Ask the assigned carer to accept the new time; unassigned calls just
      // update the portal (there's no HCA to notify yet).
      if (!isUnassignedCarer(info.carer)) {
        const offer = await createShiftOffer({
          clientId,
          su: info.su,
          day,
          time,
          type: info.type,
          carer: info.carer,
          kind: "time",
          note: `New time ${newTime} (was ${time})`,
          offeredBy: by,
        });
        offered = !!offer;
      }
      await addPortalNotice({
        clientId,
        kind: "change",
        title: `${day} visit time change`,
        body: `${info.pref}'s ${info.type.toLowerCase()} on ${day} has moved from ${time} to ${newTime}.`,
        by,
      });
    }
  }
  return NextResponse.json({ ok: true, newTime, offered });
}
