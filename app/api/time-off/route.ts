import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTimeOff, decideTimeOff, OVERSIGHT_ROLES, WORKFORCE_ROLES, type Role } from "@/lib/db";

export const runtime = "nodejs";

const KINDS = ["Annual leave", "Unpaid leave", "Sick leave", "Parental / carer's leave", "Other"];
const APPROVERS: Role[] = [...new Set([...OVERSIGHT_ROLES, ...WORKFORCE_ROLES])] as Role[];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Approve / decline a request — approvers only.
  if (body.action === "decide") {
    if (!APPROVERS.includes(session.user.role as Role)) {
      return NextResponse.json({ error: "Not authorised to decide requests" }, { status: 403 });
    }
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "Request id required" }, { status: 400 });
    await decideTimeOff({ id, approve: !!body.approve, by: session.user.name ?? "Manager", note: String(body.note ?? "").trim() });
    return NextResponse.json({ ok: true });
  }

  // Otherwise: submit a new request (any staff login).
  const kind = String(body.kind ?? "");
  const dateFrom = String(body.dateFrom ?? "").trim();
  const dateTo = String(body.dateTo ?? "").trim();
  const note = String(body.note ?? "").trim();
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Please choose a leave type" }, { status: 400 });
  if (!dateFrom || !dateTo) return NextResponse.json({ error: "Please give the dates" }, { status: 400 });

  const entry = await createTimeOff({
    requesterId: Number(session.user.id),
    requesterName: session.user.name ?? "Staff",
    requesterRole: session.user.role ?? "",
    kind,
    dateFrom,
    dateTo,
    note,
  });
  return NextResponse.json({ ok: true, entry });
}
