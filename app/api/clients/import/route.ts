import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, addClient, nextClientId, type Role } from "@/lib/db";
import { buildClient, rowErrors, type MappedRow } from "@/lib/import";

export const runtime = "nodejs";

/** Bulk-create client records from mapped CSV rows. CRM roles only. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: { rows?: MappedRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  if (rows.length > 500) return NextResponse.json({ error: "Import is limited to 500 rows at a time" }, { status: 400 });

  const valid = rows.filter((r) => rowErrors(r).length === 0);
  const skipped = rows.length - valid.length;

  // Assign ids sequentially from the current maximum.
  const first = await nextClientId();
  let n = parseInt(/\d+/.exec(first)?.[0] ?? "1", 10);
  const by = session.user.name ?? "Coordinator";
  const created: string[] = [];

  for (const row of valid) {
    const id = `CL-${String(n).padStart(3, "0")}`;
    const su = row.su?.trim() || `SU-${3200 + n}`;
    await addClient(buildClient(id, su, row), by);
    created.push(id);
    n++;
  }

  return NextResponse.json({ ok: true, created: created.length, skipped, ids: created });
}
