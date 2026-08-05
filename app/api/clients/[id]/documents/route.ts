import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, getClient, addClientDoc, type Role } from "@/lib/db";
import { DOC_STATUS } from "@/lib/crm";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Max upload size. Kept under the hosting platform's request-body limit since
 * files are stored in-row rather than in an external blob store. */
export const MAX_DOC_BYTES = 4_000_000;

/** Upload a PDF onto a client's record (multipart/form-data: file, name?, status?, expiry?). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;
  const c = await getClient(id);
  if (!c) return NextResponse.json({ error: "Unknown client" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF to upload." }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files can be uploaded." }, { status: 415 });
  if (file.size === 0) return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  if (file.size > MAX_DOC_BYTES) return NextResponse.json({ error: "That file is over the 4 MB limit." }, { status: 413 });

  const status = String(form.get("status") ?? "on_file");
  if (!DOC_STATUS[status]) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const name = (String(form.get("name") ?? "").trim() || file.name.replace(/\.pdf$/i, "")).slice(0, 160);
  const expiry = form.get("expiry") ? String(form.get("expiry")) : null;
  const data = Buffer.from(await file.arrayBuffer());

  const row = await addClientDoc({
    clientId: id, name, status, expiry, addedBy: session.user.name ?? "Coordinator",
    file: { data, mime: file.type, size: file.size, origName: file.name.slice(0, 200) },
  });
  return NextResponse.json({ ok: true, doc: row });
}
