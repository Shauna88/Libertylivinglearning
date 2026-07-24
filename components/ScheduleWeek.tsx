"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScheduleDay } from "@/lib/crm";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const UN = "Unassigned";

export type PendingReq = { id: number; day: string; time: string; carer: string; note: string; requestedBy: string };

export default function ScheduleWeek({
  clientId,
  schedule,
  carers,
  pending,
  isApprover,
}: {
  clientId: string;
  schedule: ScheduleDay[];
  carers: string[];
  pending: PendingReq[];
  isApprover: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [reqFor, setReqFor] = useState<string | null>(null);
  const [reqCarer, setReqCarer] = useState("");
  const [reqNote, setReqNote] = useState("");

  const byDay = new Map(schedule.map((d) => [d.day, d.visits]));
  const pendMap = new Map(pending.map((p) => [`${p.day}|${p.time}`, p]));
  const carerOptions = [UN, ...carers.filter((c) => !/unassigned/i.test(c))];

  async function post(id: string, url: string, body: unknown) {
    setBusy(id);
    setErr("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? "Something went wrong."); return; }
      setReqFor(null); setReqNote(""); setReqCarer("");
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  const reassignDirect = (day: string, time: string, carer: string) =>
    post(`${day}|${time}`, `/api/clients/${clientId}`, { action: "set_schedule_carer", day, time, carer });
  const sendRequest = (day: string, time: string) =>
    post(`${day}|${time}`, "/api/perm-req", { action: "create", clientId, day, time, carer: reqCarer || UN, note: reqNote });
  const decide = (id: number, approve: boolean, key: string) =>
    post(key, "/api/perm-req", { action: "decide", id, approve });

  return (
    <div>
      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}
      <p className="muted" style={{ fontSize: 12.5, margin: "0 0 12px" }}>
        {isApprover
          ? "You can reassign a call's carer directly, or approve a coordinator's pending request."
          : "Reassigning a carer is a permanent change — it goes to the CSM as a request. Day-to-day cover is managed in Rostering."}
      </p>

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
                    const key = `${day}|${v.time}`;
                    const pend = pendMap.get(key);
                    const isBusy = busy === key;
                    const requesting = reqFor === key;
                    return (
                      <div key={i} className="sched-visit">
                        <div className="flex" style={{ gap: 8, fontSize: 13, alignItems: "center", flexWrap: "wrap" }}>
                          <span className="code">{v.time}</span>
                          <strong>{v.type}</strong>
                          <span className="muted">{v.dur}</span>
                          <span className="pill tone-green" style={{ marginLeft: "auto" }}>
                            <span className="ms" style={{ fontSize: 13 }}>badge</span>{v.carer}
                          </span>
                        </div>
                        {v.tasks.length > 0 && (
                          <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{v.tasks.join(" · ")}</div>
                        )}

                        {/* pending request state */}
                        {pend && (
                          <div className="flex between wrap" style={{ gap: 8, marginTop: 6, alignItems: "center" }}>
                            <span className="pill tone-amber">
                              Change to <strong style={{ marginLeft: 3 }}>{pend.carer}</strong> — awaiting CSM
                            </span>
                            {isApprover && (
                              <span className="flex" style={{ gap: 6 }}>
                                <button className="mini primary" disabled={isBusy} onClick={() => decide(pend.id, true, key)}>Approve</button>
                                <button className="mini" disabled={isBusy} onClick={() => decide(pend.id, false, key)}>Decline</button>
                              </span>
                            )}
                          </div>
                        )}

                        {/* reassign controls */}
                        {!pend && isApprover && (
                          <label className="flex" style={{ gap: 6, marginTop: 6, alignItems: "center" }}>
                            <span className="muted" style={{ fontSize: 11.5 }}>Reassign:</span>
                            <select className="rv-select" value={v.carer} disabled={isBusy} onChange={(e) => reassignDirect(day, v.time, e.target.value)}>
                              {[...new Set([v.carer, ...carerOptions])].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </label>
                        )}
                        {!pend && !isApprover && !requesting && (
                          <button className="mini" style={{ marginTop: 6 }} onClick={() => { setReqFor(key); setReqCarer(""); setReqNote(""); }}>
                            <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>sync_alt</span>Request carer change
                          </button>
                        )}
                        {!pend && !isApprover && requesting && (
                          <div className="perm-form" style={{ marginTop: 6 }}>
                            <select className="rv-select" value={reqCarer} onChange={(e) => setReqCarer(e.target.value)}>
                              <option value="">New carer…</option>
                              {carerOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <textarea rows={2} placeholder="Reason for the CSM (e.g. continuity — client prefers this carer)…" value={reqNote} onChange={(e) => setReqNote(e.target.value)} />
                            <div className="flex" style={{ gap: 8 }}>
                              <button className="mini primary" disabled={isBusy || !reqCarer || reqNote.trim().length < 4} onClick={() => sendRequest(day, v.time)}>Send to CSM</button>
                              <button className="mini" onClick={() => setReqFor(null)}>Cancel</button>
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
    </div>
  );
}
