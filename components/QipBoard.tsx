"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QIP_STATUS } from "@/lib/audits";

export type Qip = {
  ref: string;
  source: string;
  action: string;
  owner: string;
  due: string | null;
  status: string;
};

const STATUSES = Object.keys(QIP_STATUS);

export default function QipBoard({ items, canEdit }: { items: Qip[]; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ source: "", action_text: "", owner: "", due: "" });

  const openCount = items.filter((q) => q.status !== "Complete").length;

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/qip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Something went wrong."); return false; }
      router.refresh();
      return true;
    } catch {
      setErr("Network error — please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const ok = await post({ ...f });
    if (ok) { setF({ source: "", action_text: "", owner: "", due: "" }); setOpen(false); }
  }

  return (
    <>
      <div className="flex between wrap" style={{ gap: 8, marginBottom: 10, alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 12.5 }}>{items.length} actions · {openCount} still open</span>
        {canEdit && !open && (
          <button className="btn btn-primary" style={{ padding: "7px 14px" }} onClick={() => setOpen(true)}>
            <span className="ms" style={{ fontSize: 16 }}>add</span> Raise a QIP action
          </button>
        )}
      </div>

      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="grid cols-2" style={{ gap: 10 }}>
            <div className="field"><label>Source</label><input className="input" placeholder="e.g. Medication audit / INC-2026-027" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></div>
            <div className="field"><label>Owner</label><input className="input" placeholder="e.g. Clinical Lead" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
          </div>
          <div className="field"><label>Corrective action</label><input className="input" placeholder="What will be done…" value={f.action_text} onChange={(e) => setF({ ...f, action_text: e.target.value })} /></div>
          <div className="field" style={{ maxWidth: 220 }}><label>Due</label><input className="input" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
          <div className="flex" style={{ gap: 8 }}>
            <button className="btn btn-primary" disabled={busy || f.action_text.trim().length < 3 || !f.owner.trim()} onClick={add}>Raise action</button>
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr><th>Ref</th><th>Source</th><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr>
          </thead>
          <tbody>
            {items.map((q) => {
              const meta = QIP_STATUS[q.status] ?? { label: q.status, tone: "grey" };
              return (
                <tr key={q.ref}>
                  <td><span className="code">{q.ref}</span></td>
                  <td className="muted" style={{ fontSize: 12 }}>{q.source}</td>
                  <td style={{ fontSize: 13 }}>{q.action}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{q.owner}</td>
                  <td className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{q.due ?? "—"}</td>
                  <td>
                    {canEdit ? (
                      <select className="input" style={{ fontSize: 12, padding: "4px 8px", color: `var(--${meta.tone}-fg)`, fontWeight: 700 }} value={q.status} onChange={(e) => post({ action: "status", ref: q.ref, status: e.target.value })}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`pill tone-${meta.tone}`}>{meta.label}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
