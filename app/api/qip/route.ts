import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { IMPROVEMENT_ROLES, addQip, setQipStatus, type Role } from "@/lib/db";
import { QIP_STATUS } from "@/lib/audits";

export const runtime = "nodejs";

/** Add a QIP action or change its status. Oversight / quality roles only. */
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
  const by = session.user.name ?? "Staff";

  if (b.action === "status") {
    const ref = String(b.ref ?? "");
    const status = String(b.status ?? "");
    if (!ref || !QIP_STATUS[status]) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    await setQipStatus(ref, status, by);
    return NextResponse.json({ ok: true });
  }

  // add
  const action = String(b.action_text ?? "").trim();
  const owner = String(b.owner ?? "").trim();
  if (action.length < 3) return NextResponse.json({ error: "Describe the corrective action" }, { status: 400 });
  if (!owner) return NextResponse.json({ error: "Assign an owner" }, { status: 400 });
  const row = await addQip({
    source: String(b.source ?? "").trim() || "Manual",
    action,
    owner,
    due: b.due ? String(b.due) : null,
    by,
  });
  return NextResponse.json({ ok: true, ref: row.ref });
}
