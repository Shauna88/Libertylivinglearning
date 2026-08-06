import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, getClient, listClientMeds, addClientMed, setMedActive, recordMedAdmin, type Role } from "@/lib/db";
import { isMedStatus, medTimes } from "@/lib/meds";

export const runtime = "nodejs";

/** eMAR actions for a client: add a medication, stop/resume one, or record a dose. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const { id } = await params;
  const client = await getClient(id);
  if (!client) return NextResponse.json({ error: "Unknown client" }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const action = String(body.action ?? "");
  const who = session.user.name ?? "Coordinator";

  if (action === "add_med") {
    const name = String(body.name ?? "").trim();
    if (name.length < 2) return NextResponse.json({ error: "Name the medication" }, { status: 400 });
    const prn = Boolean(body.prn);
    const times = prn ? "" : medTimes(String(body.times ?? "")).join(", ");
    if (!prn && !times) return NextResponse.json({ error: "Add at least one administration time (HH:MM), or mark it as PRN." }, { status: 400 });
    const med = await addClientMed({
      clientId: id, name, dose: String(body.dose ?? "").trim(), route: String(body.route ?? "").trim(),
      freq: String(body.freq ?? "").trim(), times, instructions: String(body.instructions ?? "").trim(), prn, addedBy: who,
    });
    return NextResponse.json({ ok: true, med });
  }
  if (action === "set_active") {
    const medId = Number(body.medId);
    if (!medId) return NextResponse.json({ error: "Medication id required" }, { status: 400 });
    await setMedActive(medId, id, Boolean(body.active), who);
    return NextResponse.json({ ok: true });
  }
  if (action === "record") {
    const medId = Number(body.medId);
    const status = String(body.status ?? "");
    if (!medId || !isMedStatus(status)) return NextResponse.json({ error: "Bad record" }, { status: 400 });
    const schedTime = String(body.schedTime ?? "").trim();
    const reason = String(body.reason ?? "").trim().slice(0, 300);
    if ((status === "refused" || status === "omitted") && !reason) {
      return NextResponse.json({ error: "A reason is required when a dose is refused or omitted." }, { status: 400 });
    }
    const serviceDate = String(body.serviceDate ?? "").trim() || new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
    await recordMedAdmin({ clientId: id, medicationId: medId, serviceDate, schedTime, status, reason, by: who });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/** The med list + today's administration record. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const { id } = await params;
  const meds = await listClientMeds(id);
  return NextResponse.json({ meds });
}
