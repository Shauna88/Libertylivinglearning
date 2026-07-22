import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { OVERSIGHT_ROLES, buildClientDsar, logAudit, logPiiReveal, type Role } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Data-subject access export (GDPR Art. 15 / 20). Returns everything held about
 * one client as a downloadable JSON file. Oversight-only, and every export is
 * written to both the PII access log and the audit trail before data is sent.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!OVERSIGHT_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { clientId } = await params;
  const bundle = await buildClientDsar(clientId);
  if (!bundle) return NextResponse.json({ error: "Unknown client" }, { status: 404 });

  const userId = Number(session.user.id);
  const userName = session.user.name ?? "Staff";
  await logPiiReveal({ userId, userName, clientId, scope: "client", reason: "Data-subject access export (DSAR)" });
  await logAudit({ actorId: userId, actorName: userName, action: "dsar.export", target: clientId, detail: bundle.client.name });

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dsar-${clientId}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
