import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addTodo, setTodoDone, deleteTodo } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = Number(session.user.id);

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
    const entry = await addTodo(userId, text.slice(0, 240));
    return NextResponse.json({ ok: true, entry });
  }
  if (action === "toggle") {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await setTodoDone(userId, id, !!body.done);
    return NextResponse.json({ ok: true });
  }
  if (action === "delete") {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteTodo(userId, id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
