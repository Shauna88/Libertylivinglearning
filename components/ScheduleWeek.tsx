"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScheduleDay } from "@/lib/crm";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const UN = "Unassigned";
const UNASSIGN_REASONS = ["Carer called in sick", "Carer no-show", "Client / family cancelled", "Client in hospital", "Reallocating cover", "Staffing change", "Other"];

export type PendingReq = { id: number; day: string; time: string; carer: string; note: string; requestedBy: string };

function isUn(c: string) {
  return !c || /unassigned|to be allocated|^tbc$/i.test(c.trim());
}

export default function ScheduleWeek({
  clientId,
  schedule,
  carers,
  pending,
  cover,
  reasons,
  isApprover,
}: {
  clientId: string;
  schedule: ScheduleDay[];
  carers: string[];
  pending: PendingReq[];
  cover: Record<string, string>;
  reasons: Record<string, string>;
  isApprover: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [panel, setPanel] = useState<{ key: string; mode: "unassign" | "perm" } | null>(null);
  const [reason, setReason] = useState(UNASSIGN_REASONS[0]);
  const [note, setNote] = useState("");
  const [pickCarer, setPickCarer] = useState("");

  const byDay = new Map(schedule.map((d) => [d.day, d.visits]));
  const pendMap = new Map(pending.map((p) => [`${p.day}|${p.time}`, p]));
  const carerOptions = [UN, ...carers.filter((c) => !isUn(c))];

  async function post(id: string, url: string, body: unknown) {
    setBusy(id);
    setErr("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? "Something went wrong."); return; }
      setPanel(null); setNote(""); setPickCarer("");
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  // temporary (this week) — no approval
  const reassignTemp = (day: string, time: string, carer: string) => post(`${day}|${time}`, "/api/cover", { action: "set", clientId, day, time, carer });
  const revert = (day: string, time: string) => post(`${day}|${time}`, "/api/cover", { action: "clear", clientId, day, time });
  const doUnassign = (day: string, time: string) => {
    const r = reason === "Other" ? note.trim() : note.trim() ? `${reason} — ${note.trim()}` : reason;
    post(`${day}|${time}`, "/api/cover", { action: "set", clientId, day, time, carer: UN, reason: r });
  };
  // permanent (ongoing) — coordinator requests, CSM applies
  const requestPerm = (day: string, time: string) => post(`${day}|${time}`, "/api/perm-req", { action: "create", clientId, day, time, carer: pickCarer || UN, note });
  const makePerm = (day: string, time: string) => post(`${day}|${time}`, `/api/clients/${clientId}`, { action: "set_schedule_carer", day, time, carer: pickCarer });
  const decide = (id: number, approve: boolean, key: string) => post(key, "/api/perm-req", { action: "decide", id, approve });

  // all calls flattened for the table view
  const allTimes = [...new Set(schedule.flatMap((d) => d.visits.map((v) => v.time)))].sort();

  function callState(day: string, v: { time: string; carer: string }) {
    const key = `${day}|${v.time}`;
    const overridden = Object.prototype.hasOwnProperty.call(cover, key);
    const effective = overridden ? cover[key] : v.carer;
    return { key, overridden, effective, base: v.carer, unassigned: isUn(effective), reason: reasons[key], pend: pendMap.get(key) };
  }

  return (
    <div>
      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}

      <div className="flex between wrap" style={{ gap: 8, marginBottom: 10, alignItems: "center" }}>
        <p className="muted" style={{ fontSize: 12.5, margin: 0, maxWidth: "60ch" }}>
          Reassigning or unassigning a call changes it for <strong>this week</strong> only (reverts to the base plan). A permanent carer change needs CSM approval.
        </p>
        <div className="flex" style={{ gap: 6 }}>
          {(["cards", "table"] as const).map((m) => (
            <button key={m} className={`chip${view === m ? " active" : ""}`} onClick={() => setView(m)}>{m === "cards" ? "Cards" : "Table"}</button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl sched-table">
            <thead>
              <tr>
                <th>Time</th>
                {WEEK.map((d) => <th key={d}>{d.slice(0, 3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {allTimes.map((t) => (
                <tr key={t}>
                  <td className="code">{t}</td>
                  {WEEK.map((day) => {
                    const v = (byDay.get(day) ?? []).find((x) => x.time === t);
                    if (!v) return <td key={day} className="muted" style={{ textAlign: "center" }}>·</td>;
                    const st = callState(day, v);
                    return (
                      <td key={day}>
                        <div style={{ fontWeight: 600, fontSize: 11.5 }}>{v.type}</div>
                        <div style={{ fontSize: 11, color: st.unassigned ? "var(--red-fg)" : "var(--text-2)" }}>
                          {st.unassigned ? "Unassigned" : st.effective}{st.overridden && !st.unassigned ? " (cover)" : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid cols-2">
          {WEEK.map((day) => {
            const visits = byDay.get(day) ?? [];
            return (
              <div key={day} className="card">
                <strong style={{ fontSize: 14 }}>{day}</strong>
                {visits.length === 0 ? (
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>No calls.</div>
                ) : (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                    {visits.map((v, i) => {
                      const st = callState(day, v);
                      const isBusy = busy === st.key;
                      const p = panel?.key === st.key ? panel.mode : null;
                      return (
                        <div key={i} className="sched-visit">
                          <div className="flex" style={{ gap: 8, fontSize: 13, alignItems: "center", flexWrap: "wrap" }}>
                            <span className="code">{v.time}</span>
                            <strong>{v.type}</strong>
                            <span className="muted">{v.dur}</span>
                            <span className={`pill tone-${st.unassigned ? "red" : "green"}`} style={{ marginLeft: "auto" }}>
                              <span className="ms" style={{ fontSize: 13 }}>{st.unassigned ? "person_alert" : "badge"}</span>
                              {st.unassigned ? "Unassigned" : st.effective}
                            </span>
                          </div>
                          {st.overridden && !st.unassigned && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>This week only · base {st.base}</div>}
                          {st.unassigned && st.reason && <div style={{ fontSize: 11.5, color: "var(--red-fg)", marginTop: 2 }}><span className="ms" style={{ fontSize: 13, verticalAlign: "middle" }}>info</span> {st.reason}</div>}
                          {v.tasks.length > 0 && <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{v.tasks.join(" · ")}</div>}

                          {/* pending permanent request */}
                          {st.pend && (
                            <div className="flex between wrap" style={{ gap: 8, marginTop: 6, alignItems: "center" }}>
                              <span className="pill tone-amber">Permanent → <strong style={{ marginLeft: 3 }}>{st.pend.carer}</strong> — awaiting CSM</span>
                              {isApprover && (
                                <span className="flex" style={{ gap: 6 }}>
                                  <button className="mini primary" disabled={isBusy} onClick={() => decide(st.pend!.id, true, st.key)}>Approve</button>
                                  <button className="mini" disabled={isBusy} onClick={() => decide(st.pend!.id, false, st.key)}>Decline</button>
                                </span>
                              )}
                            </div>
                          )}

                          {/* action row */}
                          <div className="rv-actions" style={{ marginTop: 6 }}>
                            <label className="rv-assign">
                              <span className="muted" style={{ fontSize: 11 }}>This week:</span>
                              <select className="rv-select" value={st.unassigned ? UN : st.effective} disabled={isBusy} onChange={(e) => { const c = e.target.value; if (c === UN) { setPanel({ key: st.key, mode: "unassign" }); setReason(UNASSIGN_REASONS[0]); setNote(""); } else reassignTemp(day, v.time, c); }}>
                                {[...new Set([st.effective, ...carerOptions])].map((c) => <option key={c} value={c}>{isUn(c) ? "Unassign…" : c}</option>)}
                              </select>
                            </label>
                            {st.overridden && <button className="mini" disabled={isBusy} onClick={() => revert(day, v.time)}>Revert</button>}
                            {!st.pend && (
                              <button className="mini" onClick={() => { setPanel(p === "perm" ? null : { key: st.key, mode: "perm" }); setPickCarer(""); setNote(""); }}>
                                <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>event_repeat</span>{isApprover ? "Change permanently" : "Request permanent change"}
                              </button>
                            )}
                          </div>

                          {/* unassign reason panel */}
                          {p === "unassign" && (
                            <div className="perm-form" style={{ marginTop: 6 }}>
                              <select className="rv-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                                {UNASSIGN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <input className="input" style={{ fontSize: 12.5, padding: "6px 9px" }} placeholder={reason === "Other" ? "Describe the reason…" : "Add a note (optional)…"} value={note} onChange={(e) => setNote(e.target.value)} />
                              <div className="flex" style={{ gap: 8 }}>
                                <button className="mini primary" disabled={isBusy || (reason === "Other" && note.trim().length < 3)} onClick={() => doUnassign(day, v.time)}>Unassign this week</button>
                                <button className="mini" onClick={() => setPanel(null)}>Cancel</button>
                              </div>
                            </div>
                          )}

                          {/* permanent change panel */}
                          {p === "perm" && (
                            <div className="perm-form" style={{ marginTop: 6 }}>
                              <select className="rv-select" value={pickCarer} onChange={(e) => setPickCarer(e.target.value)}>
                                <option value="">New permanent carer…</option>
                                {carerOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                              {!isApprover && <textarea rows={2} placeholder="Reason for the CSM (why this should be a permanent change)…" value={note} onChange={(e) => setNote(e.target.value)} />}
                              <div className="flex" style={{ gap: 8 }}>
                                {isApprover ? (
                                  <button className="mini primary" disabled={isBusy || !pickCarer} onClick={() => makePerm(day, v.time)}>Apply permanently</button>
                                ) : (
                                  <button className="mini primary" disabled={isBusy || !pickCarer || note.trim().length < 4} onClick={() => requestPerm(day, v.time)}>Send to CSM</button>
                                )}
                                <button className="mini" onClick={() => setPanel(null)}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
