import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, setClientAssessment, type Role } from "@/lib/db";
import { ASSESSMENT_ITEM } from "@/lib/assessments";

export const runtime = "nodejs";

/** Record / update / clear a client assessment or care-plan review. CRM roles. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clientId = String(body.clientId ?? "").trim();
  const itemKey = String(body.itemKey ?? "").trim();
  if (!clientId || !ASSESSMENT_ITEM[itemKey]) {
    return NextResponse.json({ error: "Unknown client or assessment" }, { status: 400 });
  }

  const done = body.done !== false;
  const dateOrNull = (v: unknown): string | null => {
    if (v == null || !String(v).trim()) return null;
    const raw = String(v).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  };
  const completedOn = done ? dateOrNull(body.completedOn) : null;
  const reviewDue = done ? dateOrNull(body.reviewDue) : null;
  if (done && body.reviewDue && !reviewDue) {
    return NextResponse.json({ error: "Review date must be YYYY-MM-DD" }, { status: 400 });
  }

  await setClientAssessment({ clientId, itemKey, done, completedOn, reviewDue, by: session.user.name ?? "Office" });
  return NextResponse.json({ ok: true });
}
