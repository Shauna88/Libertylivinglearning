import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { IMPROVEMENT_ROLES, createAssignment, withdrawAssignment, type Role } from "@/lib/db";
import { getCourse, getSop } from "@/lib/content";
import { AUDIENCES } from "@/lib/improvement";

export const runtime = "nodejs";

/** Push a course or SOP to an audience (standalone, outside a sign-off). */
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

  // withdraw path
  if (b.withdraw) {
    const id = Number(b.withdraw);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await withdrawAssignment(id);
    return NextResponse.json({ ok: true, withdrawn: id });
  }

  const kind = String(b.kind ?? "");
  const refId = String(b.refId ?? "");
  const audience = String(b.audience ?? "");
  const note = String(b.note ?? "").trim();
  const due = b.due ? String(b.due) : null;

  if (kind !== "course" && kind !== "sop") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!AUDIENCES.includes(audience as (typeof AUDIENCES)[number])) {
    return NextResponse.json({ error: "Choose an audience" }, { status: 400 });
  }

  let refTitle: string;
  if (kind === "course") {
    const c = getCourse(refId);
    if (!c) return NextResponse.json({ error: "Unknown course" }, { status: 404 });
    refTitle = c.title;
  } else {
    const s = getSop(refId);
    if (!s) return NextResponse.json({ error: "Unknown SOP" }, { status: 404 });
    refTitle = `${s.id} ${s.title}`;
  }

  const row = await createAssignment({
    kind,
    refId,
    refTitle,
    audience,
    note,
    due,
    assignedBy: session.user.name ?? "Staff",
  });
  return NextResponse.json({ ok: true, assignment: row });
}
