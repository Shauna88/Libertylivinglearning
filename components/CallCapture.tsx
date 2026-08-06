"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const sm = { padding: "4px 9px", fontSize: 11.5 } as const;

/**
 * Inline point-of-care capture on the live monitor — check a call in / out (or
 * undo) without leaving the board, so the attendance record is captured as the
 * day runs. Posts to the same ECM endpoint as the call monitor.
 */
export default function CallCapture({ clientId, time, carer, state }: { clientId: string; time: string; carer: string; state: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  async function act(action: "checkin" | "checkout" | "undo", body: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const res = await fetch("/api/ecm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, clientId, schedTime: time, carer, ...body }),
      });
      if (res.ok) { setNoteOpen(false); setNote(""); router.refresh(); }
    } finally {
      setBusy(false);
    }
  }

  if (state === "suspended" || state === "unassigned") return <span className="muted">—</span>;
  if (state === "completed") return <button className="btn" style={sm} disabled={busy} onClick={() => act("undo")}>Undo</button>;
  if (state === "onsite") {
    if (noteOpen) {
      return (
        <div className="flex" style={{ gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <input className="input" style={{ fontSize: 11.5, padding: "4px 8px", minWidth: 130, flex: 1 }} placeholder="Visit note (optional)" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
          <button className="btn btn-primary" style={sm} disabled={busy} onClick={() => act("checkout", { note })}>Complete</button>
          <button className="btn" style={sm} disabled={busy} onClick={() => { setNoteOpen(false); setNote(""); }}>×</button>
        </div>
      );
    }
    return (
      <div className="flex" style={{ gap: 6, justifyContent: "flex-end" }}>
        <button className="btn btn-primary" style={sm} disabled={busy} onClick={() => setNoteOpen(true)}>Check out</button>
        <button className="btn" style={sm} disabled={busy} onClick={() => act("undo")}>Undo</button>
      </div>
    );
  }
  return <button className="btn btn-primary" style={sm} disabled={busy} onClick={() => act("checkin")}>Check in</button>;
}
