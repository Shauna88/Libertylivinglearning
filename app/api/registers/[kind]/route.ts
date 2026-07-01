import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { REGISTERS, type RegisterKind } from "@/lib/registers";
import { createRegisterEntry } from "@/lib/db";

export const runtime = "nodejs";

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

  const entry = createRegisterEntry({
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
