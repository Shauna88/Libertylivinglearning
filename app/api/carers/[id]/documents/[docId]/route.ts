import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, WORKFORCE_ROLES, getCarerDocFile, deleteCarerDoc, type Role } from "@/lib/db";

export const runtime = "nodejs";

const CAN_EDIT: Role[] = [...new Set([...CRM_ROLES, ...WORKFORCE_ROLES])] as Role[];

/** Download / view a carer document file (auth-gated, scoped to the carer). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CAN_EDIT.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  const { id, docId } = await params;
  const file = await getCarerDocFile(Number(docId), id);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filename = (file.orig_name || `${file.name}.pdf`).replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(new Uint8Array(file.file_data), {
    headers: {
      "Content-Type": file.mime || "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(file.file_data.length),
      "Cache-Control": "private, no-store",
    },
  });
}

/** Remove a carer document. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CAN_EDIT.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  const { docId } = await params;
  await deleteCarerDoc(Number(docId), session.user.name ?? "Coordinator");
  return NextResponse.json({ ok: true });
}
