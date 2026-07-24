"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RefGroup } from "@/lib/refs";

export type SystemTodo = { icon: string; tone: string; text: string; href: string };
export type PersonalTodo = {
  id: number;
  text: string;
  href: string | null;
  done: boolean;
  toDept?: string | null;
  fromName?: string | null;
  mine?: boolean;
  refLabel?: string | null;
  refHref?: string | null;
};

export default function TodoBoard({
  title,
  emptyText,
  systemTodos,
  todos,
  presets = [],
  depts = [],
  myDept = "",
  refGroups = [],
}: {
  title: string;
  emptyText: string;
  systemTodos: SystemTodo[];
  todos: PersonalTodo[];
  presets?: string[];
  depts?: string[];
  myDept?: string;
  refGroups?: RefGroup[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [share, setShare] = useState(""); // "" = just me, else a department
  const [refHref, setRefHref] = useState(""); // "relates to" a client / carer
  const [busy, setBusy] = useState(false);

  const refLabels = new Map<string, string>();
  refGroups.forEach((g) => g.options.forEach((o) => refLabels.set(o.href, o.label)));

  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const outstanding = systemTodos.length + pending.length;
  const accent = outstanding ? "amber" : "green";

  async function post(body: unknown) {
    setBusy(true);
    try {
      await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  async function add() {
    const t = text.trim();
    if (t.length < 2) return;
    setText("");
    const toDept = share || null;
    const rHref = refHref || null;
    const rLabel = refHref ? refLabels.get(refHref) ?? null : null;
    setShare(""); setRefHref("");
    await post({ action: "add", text: t, toDept, refHref: rHref, refLabel: rLabel });
  }

  function tag(t: PersonalTodo) {
    if (!t.toDept) return null;
    if (t.mine) return <span className="pill tone-blue" style={{ fontSize: 10 }}><span className="ms" style={{ fontSize: 12 }}>arrow_forward</span>{t.toDept}</span>;
    return <span className="pill tone-amber" style={{ fontSize: 10 }}><span className="ms" style={{ fontSize: 12 }}>groups</span>{t.fromName ? `from ${t.fromName}` : "shared"}</span>;
  }
  function refChip(t: PersonalTodo) {
    if (!t.refLabel || !t.refHref) return null;
    return <Link href={t.refHref} className="pill tone-teal" style={{ fontSize: 10 }} title={`Open ${t.refLabel}`}><span className="ms" style={{ fontSize: 12 }}>link</span>{t.refLabel}</Link>;
  }

  return (
    <div className="card" style={{ borderLeft: `4px solid var(--${accent}-fg)`, marginBottom: 8 }}>
      <div className="flex between" style={{ alignItems: "center", marginBottom: outstanding || done.length ? 10 : 8 }}>
        <strong style={{ fontSize: 14 }}>{title}{outstanding ? ` · ${outstanding}` : ""}</strong>
        {!outstanding && <span className="pill tone-green"><span className="ms" style={{ fontSize: 14 }}>check_circle</span>{emptyText}</span>}
      </div>

      {/* system prompts — click to jump to the outstanding tab */}
      {systemTodos.map((t, i) => (
        <Link key={`s${i}`} href={t.href} className="dash-row todo-row">
          <span className="ms" style={{ fontSize: 18, color: `var(--${t.tone}-fg)` }}>{t.icon}</span>
          <span style={{ fontSize: 13 }}>{t.text}</span>
          <span className="pill tone-grey" style={{ marginLeft: "auto", fontSize: 10.5 }}>Auto</span>
          <span className="ms" style={{ fontSize: 16, color: "var(--text-2)" }}>chevron_right</span>
        </Link>
      ))}

      {/* personal + shared to-dos — tick to complete */}
      {pending.map((t) => (
        <div key={`p${t.id}`} className="dash-row todo-row">
          <button className="todo-check" disabled={busy} title="Mark complete" onClick={() => post({ action: "toggle", id: t.id, done: true })}>
            <span className="ms" style={{ fontSize: 18 }}>radio_button_unchecked</span>
          </button>
          {t.href ? <Link href={t.href} style={{ fontSize: 13, flex: 1 }}>{t.text}</Link> : <span style={{ fontSize: 13, flex: 1 }}>{t.text}</span>}
          {refChip(t)}
          {tag(t)}
          <button className="todo-del" disabled={busy} title="Delete" onClick={() => post({ action: "delete", id: t.id })}>
            <span className="ms" style={{ fontSize: 15 }}>close</span>
          </button>
        </div>
      ))}

      {done.map((t) => (
        <div key={`d${t.id}`} className="dash-row todo-row done">
          <button className="todo-check on" disabled={busy} title="Mark not done" onClick={() => post({ action: "toggle", id: t.id, done: false })}>
            <span className="ms" style={{ fontSize: 18 }}>check_circle</span>
          </button>
          <span style={{ fontSize: 13, flex: 1, textDecoration: "line-through", color: "var(--text-2)" }}>{t.text}</span>
          {refChip(t)}
          {tag(t)}
          <button className="todo-del" disabled={busy} title="Delete" onClick={() => post({ action: "delete", id: t.id })}>
            <span className="ms" style={{ fontSize: 15 }}>close</span>
          </button>
        </div>
      ))}

      {/* add a to-do — free text, quick-add templates, and share-with-department */}
      <div className="todo-add">
        <input
          className="input"
          style={{ fontSize: 13, padding: "7px 10px", flex: "2 1 200px" }}
          placeholder="Add a to-do…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        />
        {presets.length > 0 && (
          <select className="input todo-select" value="" onChange={(e) => { if (e.target.value) setText(e.target.value); }} title="Common tasks">
            <option value="">Common tasks…</option>
            {presets.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {refGroups.length > 0 && (
          <select className="input todo-select" value={refHref} onChange={(e) => setRefHref(e.target.value)} title="Relates to a client or carer">
            <option value="">Relates to…</option>
            {refGroups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
        )}
        {depts.length > 0 && (
          <select className="input todo-select" value={share} onChange={(e) => setShare(e.target.value)} title="Who's it for">
            <option value="">Just me</option>
            {depts.filter((d) => d !== myDept).map((d) => <option key={d} value={d}>Share → {d}</option>)}
          </select>
        )}
        <button className="btn" disabled={busy || text.trim().length < 2} onClick={add}>
          <span className="ms" style={{ fontSize: 18 }}>add</span>Add
        </button>
      </div>
    </div>
  );
}
