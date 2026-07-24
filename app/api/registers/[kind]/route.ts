import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { REGISTERS, type RegisterKind } from "@/lib/registers";
import { RECORD_FIELDS } from "@/lib/recordfields";
import { createRegisterEntry, updateRegisterRecord, IMPROVEMENT_ROLES, type Role } from "@/lib/db";

export const runtime = "nodejs";

/** Save an entry's regulatory record drawer (oversight / quality roles only). */
export async function PATCH(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!IMPROVEMENT_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised to complete regulatory records" }, { status: 403 });
  }
  const { kind } = await params;
  const fields = RECORD_FIELDS[kind as RegisterKind];
  if (!fields) return NextResponse.json({ error: "Unknown register" }, { status: 404 });

  let body: { id?: number; record?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Entry id required" }, { status: 400 });

  // Keep only known fields, coerced to strings.
  const record: Record<string, string> = {};
  for (const f of fields) {
    const v = body.record?.[f.key];
    if (v !== undefined && v !== null) record[f.key] = String(v);
  }
  const ok = await updateRegisterRecord({ kind, id, record, by: session.user.name ?? "Staff" });
  if (!ok) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { kind } = await params;
  const cfg = REGISTERS[kind as RegisterKind];
  if (!cfg) return NextResponse.json({ error: "Unknown register" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const category = String(body.category ?? "");
  const severity = String(body.severity ?? "");
  const summary = String(body.summary ?? "").trim();
  const detail = String(body.detail ?? "").trim();
  const location = cfg.hasLocation ? String(body.location ?? "").trim() || null : null;

  if (!cfg.categories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!cfg.severities.some((s) => s.value === severity)) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  }
  if (summary.length < 3 || detail.length < 3) {
    return NextResponse.json({ error: "Summary and detail are required" }, { status: 400 });
  }

  const entry = await createRegisterEntry({
    kind: cfg.kind,
    prefix: cfg.refPrefix,
    year: new Date().getFullYear(),
    category,
    severity,
    location,
    summary,
    detail,
    reporterId: Number(session.user.id),
    reporterName: session.user.name ?? "Staff",
  });

  return NextResponse.json({ ok: true, entry });
}
