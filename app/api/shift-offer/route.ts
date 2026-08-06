import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { decideShiftOffer } from "@/lib/db";

export const runtime = "nodejs";

/** An HCA accepts or declines a shift offered to them. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.user.role !== "Healthcare Assistant") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: { id?: number; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "A shift id is required" }, { status: 400 });
  const decision = body.action === "accept" ? "accept" : body.action === "decline" ? "decline" : null;
  if (!decision) return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });

  const offer = await decideShiftOffer({ id, carer: session.user.name ?? "", decision });
  if (!offer) return NextResponse.json({ error: "That shift is no longer available." }, { status: 409 });
  return NextResponse.json({ ok: true, status: offer.status });
}
