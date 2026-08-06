"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Empty from "@/components/Empty";
import { useToast } from "@/components/Toast";

export type RespiteItem = { id: number; client_id: string; date_from: string; date_to: string; kind: string; location: string; notes: string; added_by: string; su?: string };

const KINDS = ["Respite", "Hospital", "Holiday hold", "Temporary suspension"];
const KIND_TONE: Record<string, string> = { Respite: "teal", Hospital: "red", "Holiday hold": "amber", "Temporary suspension": "grey" };

function fmt(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}
function statusOf(from: string, to: string, today: string) {
  if (today < from) return { label: "Upcoming", tone: "blue" };
  if (today > to) return { label: "Ended", tone: "grey" };
  return { label: "Away now", tone: "amber" };
}

/** Respite / short-term-care register — clients temporarily away or on hold. */
export default function RespiteRegister({ items, clients, today, canEdit }: {
  items: RespiteItem[];
  clients: { id: string; label: string }[];
  today: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ clientId: "", dateFrom: "", dateTo: "", kind: "Respite", location: "", notes: "" });

  async function add() {
    if (!f.clientId || !f.dateFrom || !f.dateTo) { toast("Choose a client and dates", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/respite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast(j.error ?? "Could not save", "error"); return; }
      toast("Respite booking added");
      setF({ clientId: "", dateFrom: "", dateTo: "", kind: "Respite", location: "", notes: "" });
      setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/respite?id=${id}`, { method: "DELETE" });
      if (!res.ok) { toast("Could not remove", "error"); return; }
      toast("Removed");
      router.refresh();
    } finally { setBusy(false); }
  }

  const current = items.filter((r) => today >= r.date_from && today <= r.date_to).length;

  return (
    <div>
      <div className="flex between wrap" style={{ gap: 10, marginBottom: 12, alignItems: "center" }}>
        <div className="flex wrap" style={{ gap: 8 }}>
          <span className="pill tone-amber"><span className="ms" style={{ fontSize: 14 }}>flight_takeoff</span>{current} away now</span>
          <span className="pill tone-grey">{items.length} on record</span>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <a className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12.5 }} href="/api/reports/respite"><span className="ms" style={{ fontSize: 16 }}>download</span>Export CSV</a>
          {canEdit && <button className="btn" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => setOpen((o) => !o)}><span className="ms" style={{ fontSize: 16 }}>add</span>Add respite</button>}
        </div>
      </div>

      {open && canEdit && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="grid cols-3" style={{ gap: 8 }}>
            <select className="input" value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>
              <option value="">Choose client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input className="input" placeholder="Location (e.g. St Mary's respite)" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
            <label className="field" style={{ margin: 0 }}><span className="muted" style={{ fontSize: 11 }}>From</span><input className="input" type="date" value={f.dateFrom} onChange={(e) => setF({ ...f, dateFrom: e.target.value })} /></label>
            <label className="field" style={{ margin: 0 }}><span className="muted" style={{ fontSize: 11 }}>To</span><input className="input" type="date" value={f.dateTo} onChange={(e) => setF({ ...f, dateTo: e.target.value })} /></label>
          </div>
          <input className="input" placeholder="Notes (optional)" style={{ marginTop: 8 }} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <div className="flex" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12.5 }} disabled={busy} onClick={add}>Add booking</button>
            <button className="btn" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <Empty icon="hotel" title="No respite on record" hint={canEdit ? "Add a booking when a client goes into respite, hospital or a temporary hold." : undefined} />
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr><th>Client</th><th>Type</th><th>From</th><th>To</th><th>Location</th><th style={{ width: 120 }}>Status</th>{canEdit && <th style={{ width: 40 }}></th>}</tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const st = statusOf(r.date_from, r.date_to, today);
                return (
                  <tr key={r.id}>
                    <td><Link href={`/clients/${r.client_id}`} style={{ fontWeight: 600 }}>{r.su ?? r.client_id}</Link></td>
                    <td><span className={`pill tone-${KIND_TONE[r.kind] ?? "grey"}`} style={{ fontSize: 11 }}>{r.kind}</span></td>
                    <td className="muted">{fmt(r.date_from)}</td>
                    <td className="muted">{fmt(r.date_to)}</td>
                    <td className="muted">{r.location || "—"}{r.notes ? <div style={{ fontSize: 11 }}>{r.notes}</div> : null}</td>
                    <td><span className={`pill tone-${st.tone}`}>{st.label}</span></td>
                    {canEdit && <td style={{ textAlign: "right" }}><button className="task-x" title="Remove" disabled={busy} onClick={() => remove(r.id)}><span className="ms" style={{ fontSize: 15 }}>close</span></button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
