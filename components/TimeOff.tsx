"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TimeOffRow } from "@/lib/db";

const KINDS = ["Annual leave", "Unpaid leave", "Sick leave", "Parental / carer's leave", "Other"];
const statusTone: Record<string, string> = { pending: "amber", approved: "green", declined: "red" };

function fmt(s: string) {
  return new Date(s).toLocaleString("en-IE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TimeOff({ mine, pending, isApprover }: { mine: TimeOffRow[]; pending: TimeOffRow[]; isApprover: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState(KINDS[0]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  async function post(body: unknown) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/time-off", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
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

  async function submit() {
    if (await post({ kind, dateFrom: from.trim(), dateTo: to.trim(), note: note.trim() })) {
      setFrom(""); setTo(""); setNote(""); setOk(true);
    }
  }
  const decide = (id: number, approve: boolean) => post({ action: "decide", id, approve });

  return (
    <>
      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 12 }}>{err}</div>}

      <div className="card" style={{ marginBottom: 22 }}>
        <strong style={{ fontSize: 14.5 }}>Request time off</strong>
        <div className="grid cols-2" style={{ gap: 10, marginTop: 10 }}>
          <label className="fld"><span>Type</span>
            <select className="input" value={kind} onChange={(e) => { setKind(e.target.value); setOk(false); }}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="fld"><span>Note (optional)</span>
            <input className="input" value={note} onChange={(e) => { setNote(e.target.value); setOk(false); }} placeholder="Reason or detail…" />
          </label>
          <label className="fld"><span>From</span>
            <input className="input" value={from} onChange={(e) => { setFrom(e.target.value); setOk(false); }} placeholder="e.g. 12 Aug 2026" />
          </label>
          <label className="fld"><span>To</span>
            <input className="input" value={to} onChange={(e) => { setTo(e.target.value); setOk(false); }} placeholder="e.g. 16 Aug 2026" />
          </label>
        </div>
        <div className="flex" style={{ gap: 10, marginTop: 12, alignItems: "center" }}>
          <button className="btn btn-primary" disabled={busy || !from.trim() || !to.trim()} onClick={submit}>{busy ? "Sending…" : "Submit request"}</button>
          {ok && <span className="pill tone-green"><span className="ms" style={{ fontSize: 14 }}>check_circle</span>Sent to your manager</span>}
        </div>
      </div>

      {isApprover && (
        <>
          <div className="section-title">Requests awaiting your decision{pending.length ? ` · ${pending.length}` : ""}</div>
          {pending.length === 0 ? (
            <div className="card muted" style={{ fontSize: 13, marginBottom: 22 }}>No requests waiting.</div>
          ) : (
            <div className="grid" style={{ gap: 10, marginBottom: 22 }}>
              {pending.map((r) => (
                <div key={r.id} className="card" style={{ borderLeft: "4px solid var(--amber-fg)" }}>
                  <div className="flex between wrap" style={{ gap: 8, alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: 13.5 }}>{r.requester_name}</strong>
                      <span className="muted" style={{ fontSize: 12 }}> · {r.requester_role}</span>
                      <div style={{ fontSize: 12.5, marginTop: 2 }}><span className="pill tone-grey">{r.kind}</span> <strong>{r.date_from} → {r.date_to}</strong></div>
                      {r.note && <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{r.note}</div>}
                    </div>
                    <div className="flex" style={{ gap: 8 }}>
                      <button className="mini primary" disabled={busy} onClick={() => decide(r.id, true)}>Approve</button>
                      <button className="mini" disabled={busy} onClick={() => decide(r.id, false)}>Decline</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="section-title">Your requests</div>
      {mine.length === 0 ? (
        <div className="card muted" style={{ fontSize: 13 }}>You haven&apos;t requested any time off yet.</div>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {mine.map((r) => (
            <div key={r.id} className="card">
              <div className="flex between wrap" style={{ gap: 8, alignItems: "center" }}>
                <div>
                  <span className="pill tone-grey">{r.kind}</span> <strong style={{ fontSize: 13.5 }}>{r.date_from} → {r.date_to}</strong>
                  {r.note && <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{r.note}</div>}
                  {r.decided_by && <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{r.status === "approved" ? "Approved" : "Declined"} by {r.decided_by}{r.decided_note ? ` — ${r.decided_note}` : ""}</div>}
                </div>
                <span className={`pill tone-${statusTone[r.status] ?? "grey"}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span>
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Requested {fmt(r.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
