import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, getClient, listClients, logPiiReveal, type Role } from "@/lib/db";
import { identityOf } from "@/lib/crm";

export const runtime = "nodejs";

/**
 * The PII reveal-gate. A CRM user reveals identifiable client data by giving a
 * reason; every reveal is written to pii_access_log before any data is returned.
 * Identifiable data is never sent to the browser until this succeeds.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised for client data" }, { status: 403 });
  }

  let body: { scope?: string; clientId?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scope = body.scope === "client" ? "client" : "register";
  const reason = String(body.reason ?? "").trim();
  if (reason.length < 3) {
    return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  }

  const userId = Number(session.user.id);
  const userName = session.user.name ?? "Staff";

  if (scope === "client") {
    const clientId = String(body.clientId ?? "");
    const c = await getClient(clientId);
    if (!c) return NextResponse.json({ error: "Unknown client" }, { status: 404 });
    await logPiiReveal({ userId, userName, clientId, scope: "client", reason });
    return NextResponse.json({ scope: "client", clientId, identity: identityOf(c) });
  }

  // register scope: reveal the names across the list
  await logPiiReveal({ userId, userName, clientId: null, scope: "register", reason });
  const clients = await listClients();
  const names: Record<string, string> = {};
  for (const c of clients) names[c.id] = c.name;
  return NextResponse.json({ scope: "register", names });
}
