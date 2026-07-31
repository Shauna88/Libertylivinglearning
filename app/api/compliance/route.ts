import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { WORKFORCE_ROLES, OVERSIGHT_ROLES, setCarerCompliance, type Role } from "@/lib/db";
import { COMPLIANCE_ITEM } from "@/lib/compliance";

export const runtime = "nodejs";

// HR / workforce and senior oversight roles keep carer credentials in date.
const CAN_EDIT: Role[] = [...new Set([...WORKFORCE_ROLES, ...OVERSIGHT_ROLES])] as Role[];

/** Record / update / clear one carer credential. */
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

  const carerId = String(body.carerId ?? "").trim();
  const itemKey = String(body.itemKey ?? "").trim();
  if (!carerId || !COMPLIANCE_ITEM[itemKey]) {
    return NextResponse.json({ error: "Unknown carer or credential" }, { status: 400 });
  }

  const held = body.held !== false;
  let expiry: string | null = null;
  if (held && body.expiry != null && String(body.expiry).trim()) {
    const raw = String(body.expiry).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return NextResponse.json({ error: "Expiry must be a YYYY-MM-DD date" }, { status: 400 });
    }
    expiry = raw;
  }

  await setCarerCompliance({ carerId, itemKey, held, expiry, by: session.user.name ?? "Office" });
  return NextResponse.json({ ok: true });
}
