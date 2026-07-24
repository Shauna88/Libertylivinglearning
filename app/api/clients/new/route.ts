import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, addClient, nextClientId, type Role } from "@/lib/db";
import type { Client } from "@/lib/crm";

export const runtime = "nodejs";

const s = (v: unknown) => String(v ?? "").trim();

/** Create a new client referral (intake). Lands as status "new". CRM roles only. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName = s(b.firstName);
  const surname = s(b.surname);
  const area = s(b.area);
  if (!firstName || !surname) return NextResponse.json({ error: "First name and surname are required" }, { status: 400 });
  if (!area) return NextResponse.json({ error: "Area is required" }, { status: 400 });

  const id = await nextClientId();
  const n = parseInt(/\d+/.exec(id)?.[0] ?? "1", 10);
  const su = s(b.su) || `SU-${3200 + n}`;
  const by = session.user.name ?? "Coordinator";

  const nokName = s(b.nokName);
  const conditions = s(b.conditions)
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);

  const c: Client = {
    id,
    su,
    name: `${firstName} ${surname}`,
    pref: s(b.pref) || firstName,
    dob: s(b.dob),
    sex: s(b.sex),
    addr: s(b.addr),
    eircode: s(b.eircode),
    phone: s(b.phone),
    mobile: s(b.mobile),
    area,
    status: "new",
    funding: s(b.funding) || "—",
    pkg: s(b.pkg) || "Home support (to assess)",
    hoursWk: s(b.hoursWk) || "—",
    startDate: s(b.startDate),
    gp: { name: s(b.gpName), practice: s(b.gpPractice), phone: s(b.gpPhone) },
    nok: nokName ? [{ name: nokName, rel: s(b.nokRel), phone: s(b.nokPhone) }] : [],
    keysafe: s(b.keysafe),
    access: s(b.access),
    homeRisk: [],
    conditions,
    mobility: s(b.mobility),
    allergies: s(b.allergies) || "None recorded",
    carer: "",
    carers: [],
    csm: s(b.coordinator),
    lastVisit: "—",
    reviewDue: "Assessment due",
    reviewTone: "amber",
    reviewNote: s(b.referralNote) || "New referral — intake; care plan and schedule to be completed.",
    flags: ["New referral"],
    notes: [],
    schedule: [],
    carePlan: [],
    requirements: [],
  };

  await addClient(c, by);
  return NextResponse.json({ ok: true, id });
}
