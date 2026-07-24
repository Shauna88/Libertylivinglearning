import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CRM_ROLES,
  getClient,
  addCareNote,
  addClientDoc,
  deleteClientDoc,
  editCarePlanTask,
  type Role,
} from "@/lib/db";
import { CARE_NOTE_CATEGORIES, DOC_STATUS, noteToneFor } from "@/lib/crm";

export const runtime = "nodejs";

/** Editable client-profile actions: care notes, documents, care-plan tasks. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!CRM_ROLES.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;
  const c = await getClient(id);
  if (!c) return NextResponse.json({ error: "Unknown client" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const who = session.user.name ?? "Coordinator";

  switch (action) {
    case "add_note": {
      const category = String(body.category ?? "");
      if (!CARE_NOTE_CATEGORIES.some((x) => x.key === category)) {
        return NextResponse.json({ error: "Choose a category" }, { status: 400 });
      }
      const note = String(body.note ?? "").trim();
      if (note.length < 3) return NextResponse.json({ error: "Write the note" }, { status: 400 });
      const row = await addCareNote({ clientId: id, category, tone: noteToneFor(category), note, author: who });
      return NextResponse.json({ ok: true, note: row });
    }
    case "add_doc": {
      const name = String(body.name ?? "").trim();
      if (name.length < 2) return NextResponse.json({ error: "Name the document" }, { status: 400 });
      const status = String(body.status ?? "on_file");
      if (!DOC_STATUS[status]) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      const expiry = body.expiry ? String(body.expiry) : null;
      const row = await addClientDoc({ clientId: id, name, status, expiry, addedBy: who });
      return NextResponse.json({ ok: true, doc: row });
    }
    case "del_doc": {
      const docId = Number(body.docId);
      if (!docId) return NextResponse.json({ error: "Document id required" }, { status: 400 });
      await deleteClientDoc(docId, who);
      return NextResponse.json({ ok: true });
    }
    case "add_task":
    case "del_task": {
      const domain = String(body.domain ?? "");
      const task = String(body.task ?? "").trim();
      if (!domain || task.length < 2) {
        return NextResponse.json({ error: "Domain and task are required" }, { status: 400 });
      }
      const ok = await editCarePlanTask({ clientId: id, domain, task, remove: action === "del_task", by: who });
      if (!ok) return NextResponse.json({ error: "Care-plan domain not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
