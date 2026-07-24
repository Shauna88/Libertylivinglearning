import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, upsertCarer, type Role } from "@/lib/db";

export const runtime = "nodejs";

const CAN_EDIT: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];

/** Create or update a carer in the directory. CRM / workforce roles only. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CAN_EDIT.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (name.length < 2) return NextResponse.json({ error: "A carer name is required" }, { status: 400 });

  const homeArea = String(body.homeArea ?? "").trim();
  const covers = Array.isArray(body.covers) ? body.covers.map(String) : [];
  const skills = Array.isArray(body.skills) ? body.skills.map(String) : [];
  // Home area is always within the travel radius.
  if (homeArea && !covers.includes(homeArea)) covers.unshift(homeArea);

  const capacityHours = clampInt(body.capacityHours, 37, 0, 60);
  const committedHours = clampInt(body.committedHours, 0, 0, capacityHours);
  const status = /^(active|inactive)$/.test(String(body.status)) ? String(body.status) : "active";

  const id = await upsertCarer({
    id: body.id ? String(body.id) : undefined,
    name,
    homeArea,
    covers,
    skills,
    pathway: String(body.pathway ?? "").trim(),
    transport: String(body.transport ?? "").trim(),
    capacityHours,
    committedHours,
    status,
    note: String(body.note ?? "").trim(),
    by: session.user.name ?? "Office",
  });

  return NextResponse.json({ ok: true, id });
}

function clampInt(v: unknown, dflt: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}
