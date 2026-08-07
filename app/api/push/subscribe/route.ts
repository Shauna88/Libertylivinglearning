import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { savePushSubscription, deletePushSubscription } from "@/lib/db";

export const runtime = "nodejs";

type SubBody = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/** Register this device's push subscription against the signed-in user. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: SubBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const authKey = body.keys?.auth;
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Incomplete subscription" }, { status: 400 });
  }
  await savePushSubscription({ userId: Number(session.user.id), endpoint, p256dh, auth: authKey });
  return NextResponse.json({ ok: true });
}

/** Remove this device's subscription (on unsubscribe). */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let body: SubBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.endpoint) await deletePushSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
