import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CRM_ROLES,
  OVERSIGHT_ROLES,
  getClient,
  addCareNote,
  addClientDoc,
  deleteClientDoc,
  editCarePlanTask,
  saveClientSchedule,
  setScheduleCarer,
  type Role,
} from "@/lib/db";
import type { ScheduleDay, ScheduleVisit } from "@/lib/crm";
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
    case "set_schedule_carer": {
      // Direct permanent carer change — CSM / manager only.
      if (!OVERSIGHT_ROLES.includes(session.user.role as Role)) {
        return NextResponse.json({ error: "Only a CSM can change the permanent schedule directly" }, { status: 403 });
      }
      const day = String(body.day ?? "");
      const time = String(body.time ?? "");
      const carer = String(body.carer ?? "").trim();
      if (!day || !time || !carer) return NextResponse.json({ error: "day, time and carer are required" }, { status: 400 });
      const ok = await setScheduleCarer({ clientId: id, day, time, carer, by: who });
      if (!ok) return NextResponse.json({ error: "Visit not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    case "save_schedule": {
      const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const raw = Array.isArray(body.schedule) ? (body.schedule as unknown[]) : null;
      if (!raw) return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
      const schedule: ScheduleDay[] = [];
      for (const d of raw as Array<{ day?: unknown; visits?: unknown }>) {
        const day = String(d.day ?? "");
        if (!WEEK.includes(day)) continue;
        const visitsRaw = Array.isArray(d.visits) ? (d.visits as Array<Record<string, unknown>>) : [];
        const visits: ScheduleVisit[] = [];
        for (const v of visitsRaw) {
          const time = String(v.time ?? "").trim();
          if (!/^\d{1,2}:\d{2}$/.test(time)) continue; // a valid HH:MM is required
          visits.push({
            time,
            dur: String(v.dur ?? "30m").trim() || "30m",
            type: String(v.type ?? "Call").trim() || "Call",
            carer: String(v.carer ?? "").trim() || "Unassigned",
            tasks: Array.isArray(v.tasks)
              ? (v.tasks as unknown[]).map((t) => String(t).trim()).filter(Boolean)
              : String(v.tasks ?? "")
                  .split(/[;,]/)
                  .map((t) => t.trim())
                  .filter(Boolean),
          });
        }
        if (visits.length) {
          visits.sort((a, b) => a.time.localeCompare(b.time));
          schedule.push({ day, visits });
        }
      }
      schedule.sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day));
      const ok = await saveClientSchedule({ clientId: id, schedule, by: who });
      if (!ok) return NextResponse.json({ error: "Client not found" }, { status: 404 });
      return NextResponse.json({ ok: true, calls: schedule.reduce((n, d) => n + d.visits.length, 0) });
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
