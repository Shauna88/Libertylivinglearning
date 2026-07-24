import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createMessage } from "@/lib/db";
import { MESSAGE_DEPTS, messagingDept } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const toDept = String(body.toDept ?? "");
  const subject = String(body.subject ?? "").trim();
  const messageBody = String(body.body ?? "").trim();
  const kind = body.kind === "meeting" ? "meeting" : "message";
  const meetingAt = kind === "meeting" ? String(body.meetingAt ?? "").trim() || null : null;
  const parentId = body.parentId ? Number(body.parentId) : null;

  if (!(MESSAGE_DEPTS as readonly string[]).includes(toDept)) {
    return NextResponse.json({ error: "Choose a department to send to" }, { status: 400 });
  }
  if (subject.length < 2) return NextResponse.json({ error: "A subject is required" }, { status: 400 });
  if (kind === "meeting" && !meetingAt) return NextResponse.json({ error: "Suggest a date/time for the meeting" }, { status: 400 });

  const role = session.user.role ?? "";
  const entry = await createMessage({
    fromId: Number(session.user.id),
    fromName: session.user.name ?? "Staff",
    fromRole: role,
    fromDept: messagingDept(role),
    toDept,
    subject,
    body: messageBody,
    kind,
    meetingAt,
    parentId,
  });
  return NextResponse.json({ ok: true, entry });
}
