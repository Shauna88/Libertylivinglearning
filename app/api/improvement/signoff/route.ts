import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { IMPROVEMENT_ROLES, recordSignoff, type Role, type PushInput } from "@/lib/db";
import { getCourse, getSop } from "@/lib/content";
import { DEPARTMENTS, OUTCOMES, AUDIENCES, outcomeCloses } from "@/lib/improvement";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!IMPROVEMENT_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = String(b.kind ?? "");
  const entryId = Number(b.entryId);
  const outcome = String(b.outcome ?? "");
  const note = String(b.note ?? "").trim();
  const routeDept = b.routeDept ? String(b.routeDept) : null;
  const supervision = !!b.supervision;
  const courseId = b.courseId ? String(b.courseId) : "";
  const sopId = b.sopId ? String(b.sopId) : "";
  const audience = b.audience ? String(b.audience) : "";

  if (!["complaint", "incident", "safeguarding"].includes(kind) || !Number.isInteger(entryId)) {
    return NextResponse.json({ error: "Invalid issue" }, { status: 400 });
  }
  if (!OUTCOMES.includes(outcome as (typeof OUTCOMES)[number])) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }
  if (note.length < 3) return NextResponse.json({ error: "A review note is required" }, { status: 400 });
  if (routeDept && !DEPARTMENTS.includes(routeDept as (typeof DEPARTMENTS)[number])) {
    return NextResponse.json({ error: "Invalid department" }, { status: 400 });
  }

  const pushes: PushInput[] = [];
  const actions: string[] = [];

  if (courseId || sopId) {
    if (!AUDIENCES.includes(audience as (typeof AUDIENCES)[number])) {
      return NextResponse.json({ error: "Choose an audience for the training" }, { status: 400 });
    }
  }
  if (courseId) {
    const c = getCourse(courseId);
    if (!c) return NextResponse.json({ error: "Unknown course" }, { status: 404 });
    pushes.push({ kind: "course", refId: courseId, refTitle: c.title, audience, note: `From ${kind} review`, due: null });
    actions.push(`Assigned refresher course: ${c.title} → ${audience}`);
  }
  if (sopId) {
    const s = getSop(sopId);
    if (!s) return NextResponse.json({ error: "Unknown SOP" }, { status: 404 });
    pushes.push({ kind: "sop", refId: sopId, refTitle: s.title, audience, note: `From ${kind} review`, due: null });
    actions.push(`Pushed SOP to re-read: ${s.id} ${s.title} → ${audience}`);
  }
  if (supervision) actions.push("Scheduled 1:1 supervision (HR-08)");
  if (routeDept) actions.push(`Routed the fix to ${routeDept}`);

  await recordSignoff({
    kind,
    entryId,
    outcome,
    note,
    actions,
    routeDept,
    pushes,
    close: outcomeCloses(outcome),
    signedBy: session.user.name ?? "Staff",
  });

  return NextResponse.json({ ok: true, closed: outcomeCloses(outcome), routedTo: routeDept, actions });
}
