import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addTodo, setTodoDone, deleteTodo } from "@/lib/db";
import { MESSAGE_DEPTS, messagingDept } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = Number(session.user.id);
  const myDept = messagingDept(session.user.role ?? "");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "add");
  if (action === "add") {
    const text = String(body.text ?? "").trim();
    if (text.length < 2) return NextResponse.json({ error: "Write something to do" }, { status: 400 });
    // Optional: share the to-do with another department.
    let toDept: string | null = null;
    if (body.toDept && (MESSAGE_DEPTS as readonly string[]).includes(String(body.toDept)) && String(body.toDept) !== "All staff") {
      toDept = String(body.toDept);
    }
    const entry = await addTodo({
      userId,
      text: text.slice(0, 240),
      toDept,
      fromName: toDept ? session.user.name ?? "Staff" : null,
    });
    return NextResponse.json({ ok: true, entry });
  }
  if (action === "toggle") {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await setTodoDone(userId, myDept, id, !!body.done);
    return NextResponse.json({ ok: true });
  }
  if (action === "delete") {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteTodo(userId, myDept, id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
