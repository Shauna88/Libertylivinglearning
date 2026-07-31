import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, OVERSIGHT_ROLES, WORKFORCE_ROLES, createNotification, type Role } from "@/lib/db";
import { TEMPLATE_BY_KEY, CHANNEL_LABEL, type Channel } from "@/lib/notifications";

export const runtime = "nodejs";

const CAN_SEND: Role[] = [...new Set([...CRM_ROLES, ...OVERSIGHT_ROLES, ...WORKFORCE_ROLES])] as Role[];

/** Queue an outbound notification (SMS / email / in-app). CRM / workforce / oversight. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CAN_SEND.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const template = String(body.template ?? "").trim();
  const tpl = TEMPLATE_BY_KEY[template];
  if (!tpl) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

  const channel = String(body.channel ?? "") as Channel;
  if (!CHANNEL_LABEL[channel]) return NextResponse.json({ error: "Unknown channel" }, { status: 400 });

  const recipient = String(body.recipient ?? "").trim();
  if (!recipient) return NextResponse.json({ error: "A recipient is required" }, { status: 400 });

  const messageBody = String(body.body ?? "").trim();
  if (messageBody.length < 3) return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  const subject = String(body.subject ?? "").trim();
  const refHref = body.refHref ? String(body.refHref) : null;

  const id = await createNotification({
    template, channel, audience: tpl.audience, recipient, subject, body: messageBody, refHref, by: session.user.name ?? "Office",
  });

  return NextResponse.json({ ok: true, id, status: "queued" });
}
