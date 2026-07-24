"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CALL_EVENT_TYPES, MISSED_CAUSES, callType } from "@/lib/callevents";

export default function CallLogForm({
  clients,
  carers,
}: {
  clients: { id: string; label: string }[];
  carers: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("");
  const [clientId, setClientId] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [cause, setCause] = useState("");
  const [carer, setCarer] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const type = callType(kind);
  const isMissed = kind === "missed";
  const isPause = !!type?.pause;

  function reset() {
    setKind("");
    setClientId("");
    setVisitTime("");
    setCause("");
    setCarer("");
    setEventDate("");
    setDateTo("");
    setDetail("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/call-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          clientId,
          visitTime: isPause ? null : visitTime || null,
          cause: isMissed ? cause : null,
          carer: isMissed ? carer || null : null,
          eventDate: isPause ? eventDate || null : null,
          dateTo: isPause ? dateTo || null : null,
          detail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not log the event.");
        return;
      }
      reset();
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
        <span className="ms" style={{ fontSize: 18 }}>add</span>
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
          <label>Event type</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)} required>
            <option value="">Select…</option>
            {CALL_EVENT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Client</label>
          <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {type && <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>{type.hint}</p>}

      {isMissed && (
        <div className="grid cols-2" style={{ gap: 12 }}>
          <div className="field">
            <label>Cause</label>
            <select className="input" value={cause} onChange={(e) => setCause(e.target.value)} required>
              <option value="">Select…</option>
              {MISSED_CAUSES.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Carer involved</label>
            <select className="input" value={carer} onChange={(e) => setCarer(e.target.value)}>
              <option value="">— none —</option>
              {carers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isPause ? (
        <div className="grid cols-2" style={{ gap: 12 }}>
          <div className="field">
            <label>From</label>
            <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
          </div>
          <div className="field">
            <label>Until (optional)</label>
            <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="field">
          <label>Visit time (optional)</label>
          <input className="input" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} placeholder="e.g. 09:00" />
        </div>
      )}

      <div className="field">
        <label>What happened</label>
        <textarea className="input" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} required style={{ resize: "vertical" }} />
      </div>

      {err && <div className="error">{err}</div>}
      <div className="flex" style={{ gap: 10 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Logging…" : "Submit"}</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
