import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CRM_ROLES, getClientDocFile, type Role } from "@/lib/db";

export const runtime = "nodejs";

/** Download / view a client document file (auth-gated, scoped to the client). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  const { id, docId } = await params;
  const file = await getClientDocFile(Number(docId), id);
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
