import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, logAudit, type Role } from "@/lib/db";
import { extractCarePlan, carePlanConfigured, CarePlanNotConfiguredError } from "@/lib/careplan";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Read a care-delivery form and return structured intake data.
 *
 * The pasted text is special-category (health) data: it is sent to the AI reader
 * for extraction and NOT stored. We record only that an extraction happened
 * (actor + a redacted note) in the audit trail — never the document itself.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  if (!carePlanConfigured()) {
    return NextResponse.json(
      { error: "The AI care-plan reader isn't switched on yet — an ANTHROPIC_API_KEY needs to be set for this workspace.", notConfigured: true },
      { status: 503 }
    );
  }

  let body: { text?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = String(body.text ?? "").trim();
  if (text.length < 40) {
    return NextResponse.json({ error: "Paste the care-plan / assessment text first (a bit more to work with)." }, { status: 400 });
  }
  if (text.length > 60_000) {
    return NextResponse.json({ error: "That document is very long — paste the relevant sections (up to ~60,000 characters)." }, { status: 413 });
  }

  const contextLabel = String(body.context ?? "").trim().slice(0, 60) || "care-plan intake";

  try {
    const extract = await extractCarePlan(text);
    // Log that a read happened — actor, context, and size only. Never the text.
    await logAudit({
      actorName: session.user.name ?? "Coordinator",
      action: "careplan.read",
      target: contextLabel,
      detail: `AI care-plan reader used (${text.length} chars, ${extract.schedule.length} schedule day(s), ${extract.carePlan.length} care domain(s)). Raw document not stored.`,
    });
    return NextResponse.json({ extract });
  } catch (e) {
    if (e instanceof CarePlanNotConfiguredError) {
      return NextResponse.json({ error: e.message, notConfigured: true }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message : "The reader could not process that document.";
    return NextResponse.json({ error: `Couldn't read the document: ${msg}` }, { status: 502 });
  }
}
