"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ecmState, isEcmAlert, ECM_META, hhmm, deliveredMinutes, LATE_GRACE_MIN, type EcmState } from "@/lib/ecm";

export type EcmRow = {
  clientId: string;
  su: string;
  maskedName: string;
  area: string;
  time: string;
  type: string;
  carer: string;
  startMin: number;
  endMin: number;
  unassigned: boolean;
  suspended: boolean;
  event: { checkinAt: string | null; checkoutAt: string | null; note?: string } | null;
};

function fmtMin(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function EcmBoard({ rows, nowMin, canControl }: { rows: EcmRow[]; nowMin: number; canControl: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const withState = rows.map((r) => ({
    r,
    state: ecmState({ startMin: r.startMin, endMin: r.endMin, nowMin, unassigned: r.unassigned, suspended: r.suspended, event: r.event }),
  }));

  const alerts = withState.filter((x) => isEcmAlert(x.state));

  async function act(row: EcmRow, action: "checkin" | "checkout" | "undo") {
    const key = `${row.clientId}|${row.time}`;
    setBusy(key);
    setError("");
    try {
      const res = await fetch("/api/ecm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, clientId: row.clientId, schedTime: row.time, carer: row.carer, note: action === "checkout" ? (notes[key] ?? "") : undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not save");
      }
      if (action === "checkout") setNotes((n) => { const c = { ...n }; delete c[key]; return c; });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  const overdueBy = (startMin: number) => Math.max(0, nowMin - startMin);

  const controls = (row: EcmRow, state: EcmState) => {
    if (!canControl || row.suspended || row.unassigned) return <span className="muted">—</span>;
    const key = `${row.clientId}|${row.time}`;
    const b = busy === key;
    if (state === "completed") {
      return <button className="btn" style={btnSm} disabled={b} onClick={() => act(row, "undo")}>Undo</button>;
    }
    if (state === "onsite") {
      return (
        <div className="flex" style={{ gap: 6, justifyContent: "flex-end" }}>
          <button className="btn btn-primary" style={btnSm} disabled={b} onClick={() => act(row, "checkout")}>Check out</button>
          <button className="btn" style={btnSm} disabled={b} onClick={() => act(row, "undo")}>Undo</button>
        </div>
      );
    }
    return <button className="btn btn-primary" style={btnSm} disabled={b} onClick={() => act(row, "checkin")}>Check in</button>;
  };

  return (
    <>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      {alerts.length > 0 && (
        <>
          <div className="section-title" style={{ color: "var(--red-fg)" }}>
            Missed-visit alerts — {alerts.length} call{alerts.length === 1 ? "" : "s"} with no check-in
          </div>
          <div className="grid cols-2" style={{ marginBottom: 20 }}>
            {alerts.map(({ r, state }) => (
              <div key={`${r.clientId}|${r.time}`} className="card" style={{ borderLeft: `4px solid var(--${ECM_META[state].tone}-fg)` }}>
                <div className="flex between wrap" style={{ gap: 8 }}>
                  <div className="flex wrap" style={{ gap: 8, alignItems: "center" }}>
                    <span className="code">{r.time}</span>
                    <span className={`pill tone-${ECM_META[state].tone}`}>{ECM_META[state].label}</span>
                  </div>
                  <span className="pill tone-red" style={{ fontSize: 11 }}>{overdueBy(r.startMin)} min overdue</span>
                </div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>{r.type}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{r.maskedName} · {r.su} · {r.area} · {r.carer}</div>
                <div className="flex" style={{ gap: 6, marginTop: 10 }}>
                  {canControl && <button className="btn btn-primary" style={btnSm} disabled={busy === `${r.clientId}|${r.time}`} onClick={() => act(r, "checkin")}>Carer arrived — check in</button>}
                  <Link href="/call-log" className="btn" style={btnSm}>Log as missed</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Today&apos;s calls</div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 64 }}>Planned</th>
              <th>Client</th>
              <th>Visit</th>
              <th>Carer</th>
              <th style={{ width: 150 }}>Check-in / out</th>
              <th style={{ width: 160 }}>State</th>
              <th style={{ width: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {withState.map(({ r, state }) => {
              const dm = deliveredMinutes(r.event);
              return (
                <tr key={`${r.clientId}|${r.time}`}>
                  <td><span className="code">{r.time}</span></td>
                  <td>
                    <Link href={`/clients/${r.clientId}`} style={{ fontWeight: 600 }}>{r.maskedName}</Link>
                    <div className="code" style={{ display: "inline-block", marginLeft: 6 }}>{r.su}</div>
                  </td>
                  <td className="muted">{r.type}<div style={{ fontSize: 11 }}>{r.area}</div></td>
                  <td className="muted">{r.unassigned ? <span className="pill tone-red" style={{ fontSize: 10.5 }}>Unassigned</span> : r.carer}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>
                    {r.event?.checkinAt ? (
                      <>in {hhmm(r.event.checkinAt)}{r.event.checkoutAt ? ` · out ${hhmm(r.event.checkoutAt)}` : ""}
                        {dm != null && <div style={{ fontSize: 11, color: "var(--green-fg)" }}>{fmtMin(dm)} delivered</div>}
                        {state === "onsite" && canControl && (
                          <textarea
                            className="input"
                            rows={2}
                            placeholder="Visit diary note (optional) — how the visit went…"
                            style={{ marginTop: 6, fontSize: 12, resize: "vertical", minWidth: 180 }}
                            value={notes[`${r.clientId}|${r.time}`] ?? ""}
                            onChange={(e) => setNotes((n) => ({ ...n, [`${r.clientId}|${r.time}`]: e.target.value }))}
                          />
                        )}
                        {r.event.note && state === "completed" && (
                          <div style={{ marginTop: 5, fontSize: 12, color: "var(--text)", display: "flex", gap: 5 }}>
                            <span className="ms" style={{ fontSize: 14, color: "var(--blue-fg)" }} aria-hidden="true">sticky_note_2</span>
                            <span>{r.event.note}</span>
                          </div>
                        )}
                      </>
                    ) : "—"}
                  </td>
                  <td><span className={`pill tone-${ECM_META[state].tone}`}>{ECM_META[state].label}</span></td>
                  <td style={{ textAlign: "right" }}>{controls(r, state)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canControl && (
        <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
          A call raises a missed-visit alert once it is {LATE_GRACE_MIN} minutes past its planned start with no check-in.
          In the live product carers check in and out on their phone at the point of care; here the office can record it too.
        </p>
      )}
    </>
  );
}

const btnSm = { padding: "5px 10px", fontSize: 12 } as const;
