"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const KINDS = [
  { value: "late", label: "Late call" },
  { value: "missed", label: "Missed visit" },
  { value: "noshow", label: "No-show (client)" },
  { value: "other", label: "Other" },
];

export default function CallLogForm({ clients }: { clients: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("");
  const [clientId, setClientId] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/call-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, clientId: clientId || null, visitTime: visitTime || null, detail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not log the event.");
        return;
      }
      setKind("");
      setClientId("");
      setVisitTime("");
      setDetail("");
      setOpen(false);
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)} style={{ marginBottom: 18 }}>
        <span className="ms" style={{ fontSize: 18 }}>
          add
        </span>
        Log a call event
      </button>
    );
  }

  return (
    <form className="card" style={{ marginBottom: 20 }} onSubmit={submit}>
      <div className="flex between" style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>Log a call event</strong>
        <button type="button" className="signout" style={{ color: "var(--text-2)" }} onClick={() => setOpen(false)}>
          <span className="ms">close</span>
        </button>
      </div>
      <div className="grid cols-2" style={{ gap: 12 }}>
        <div className="field">
          <label>Type</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)} required>
            <option value="">Select…</option>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Client (optional)</label>
          <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— none —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Visit time (optional)</label>
        <input className="input" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} placeholder="e.g. 09:00" />
      </div>
      <div className="field">
        <label>What happened</label>
        <textarea className="input" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} required style={{ resize: "vertical" }} />
      </div>
      {err && <div className="error">{err}</div>}
      <div className="flex" style={{ gap: 10 }}>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Logging…" : "Submit"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
