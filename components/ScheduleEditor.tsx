"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScheduleDay } from "@/lib/crm";
import type { CarerMatch } from "@/lib/carers";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DURATIONS = ["15m", "30m", "45m", "60m", "90m"];
const TYPES = [
  "Personal care",
  "Personal care · double-up",
  "Lunch call",
  "Evening call",
  "Bed call",
  "Medication prompt",
  "Welfare check",
  "Domestic support",
  "Assessment / set-up",
];

type EditVisit = { time: string; dur: string; type: string; carer: string; tasks: string };
type EditDay = { day: string; visits: EditVisit[] };

const UN = "Unassigned";

function toEdit(schedule: ScheduleDay[]): EditDay[] {
  const byDay = new Map(schedule.map((d) => [d.day, d.visits]));
  return WEEK.map((day) => ({
    day,
    visits: (byDay.get(day) ?? []).map((v) => ({
      time: v.time,
      dur: v.dur,
      type: v.type,
      carer: v.carer || UN,
      tasks: (v.tasks ?? []).join("; "),
    })),
  }));
}

export default function ScheduleEditor({
  clientId,
  schedule,
  carers,
  suggestions = [],
}: {
  clientId: string;
  schedule: ScheduleDay[];
  carers: string[];
  suggestions?: CarerMatch[];
}) {
  const router = useRouter();
  const [days, setDays] = useState<EditDay[]>(() => toEdit(schedule));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const carerOptions = [UN, ...carers.filter((c) => !/unassigned/i.test(c))];
  const suggested = suggestions.filter((m) => m.areaFit !== "outside");
  const suggestedNames = suggested.map((m) => m.carer.name);
  const otherCarers = carers.filter((c) => !/unassigned/i.test(c) && !suggestedNames.includes(c));

  function mutate(fn: (d: EditDay[]) => EditDay[]) {
    setDays((prev) => fn(structuredClone(prev)));
    setDirty(true);
    setSaved(false);
  }
  const setV = (di: number, vi: number, k: keyof EditVisit, val: string) =>
    mutate((d) => { d[di].visits[vi][k] = val; return d; });
  const addV = (di: number) =>
    mutate((d) => {
      const last = d[di].visits[d[di].visits.length - 1];
      d[di].visits.push({ time: last ? last.time : "09:00", dur: "30m", type: "Personal care", carer: UN, tasks: "" });
      return d;
    });
  const delV = (di: number, vi: number) =>
    mutate((d) => { d[di].visits.splice(vi, 1); return d; });
  // Copy one day's calls onto every other day — a big time-saver when most days match.
  const copyToAll = (di: number) =>
    mutate((d) => {
      const src = structuredClone(d[di].visits);
      return d.map((day, i) => (i === di ? day : { ...day, visits: structuredClone(src) }));
    });

  const totalCalls = days.reduce((n, d) => n + d.visits.length, 0);

  const carerSelect = (di: number, vi: number, v: EditVisit) => (
    <select className="input sched-in" value={v.carer} onChange={(e) => setV(di, vi, "carer", e.target.value)}>
      <option value={UN}>{UN}</option>
      {suggested.length > 0 && (
        <optgroup label="Suggested for this client">
          {suggested.map((m) => <option key={m.carer.id} value={m.carer.name}>{m.carer.name} — {m.score}%</option>)}
        </optgroup>
      )}
      <optgroup label="All carers">
        {otherCarers.map((c) => <option key={c} value={c}>{c}</option>)}
      </optgroup>
      {v.carer && !carerOptions.includes(v.carer) && <option value={v.carer}>{v.carer}</option>}
    </select>
  );

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const payload = days
        .filter((d) => d.visits.length)
        .map((d) => ({
          day: d.day,
          visits: d.visits.map((v) => ({
            time: v.time,
            dur: v.dur,
            type: v.type,
            carer: v.carer,
            tasks: v.tasks.split(/[;,]/).map((t) => t.trim()).filter(Boolean),
          })),
        }));
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_schedule", schedule: payload }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Could not save the schedule."); return; }
      setDirty(false);
      setSaved(true);
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex between wrap" style={{ gap: 8, marginBottom: 10, alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {totalCalls} call{totalCalls === 1 ? "" : "s"} a week. This is the permanent plan — day-to-day cover is managed in Rostering.
        </span>
        <div className="flex" style={{ gap: 8, alignItems: "center" }}>
          <div className="flex" style={{ gap: 6 }}>
            {([["grid", "Week grid"], ["list", "Day detail"]] as const).map(([m, label]) => (
              <button key={m} className={`chip${view === m ? " active" : ""}`} onClick={() => setView(m)}>{label}</button>
            ))}
          </div>
          {saved && <span className="pill tone-green">Saved</span>}
          {dirty && <span className="pill tone-amber">Unsaved changes</span>}
          <button className="btn btn-primary" style={{ padding: "7px 14px" }} disabled={busy || !dirty} onClick={save}>
            {busy ? "Saving…" : "Save schedule"}
          </button>
        </div>
      </div>
      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}

      <datalist id="visit-types">
        {TYPES.map((t) => <option key={t} value={t} />)}
      </datalist>

      {view === "grid" ? (
        // Roster-style: all 7 days as columns, whole week visible at once.
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <div className="sched-week">
            {days.map((d, di) => (
              <div key={d.day} className="sched-col">
                <div className="sched-col-head">
                  <div className="flex between" style={{ alignItems: "center" }}>
                    <strong style={{ fontSize: 12.5 }}>{d.day.slice(0, 3)}</strong>
                    <span className="muted" style={{ fontSize: 10.5 }}>{d.visits.length}</span>
                  </div>
                </div>
                <div className="sched-col-body">
                  {d.visits.map((v, vi) => (
                    <div key={vi} className="sched-cell">
                      <div className="flex" style={{ gap: 4 }}>
                        <input className="input sched-in" style={{ flex: 1 }} type="time" value={v.time} onChange={(e) => setV(di, vi, "time", e.target.value)} />
                        <select className="input sched-in" style={{ width: 62 }} value={v.dur} onChange={(e) => setV(di, vi, "dur", e.target.value)}>
                          {DURATIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                          {!DURATIONS.includes(v.dur) && <option value={v.dur}>{v.dur}</option>}
                        </select>
                        <button className="task-x" title="Remove call" onClick={() => delV(di, vi)}>
                          <span className="ms" style={{ fontSize: 15 }}>close</span>
                        </button>
                      </div>
                      <input className="input sched-in" list="visit-types" value={v.type} placeholder="Type" onChange={(e) => setV(di, vi, "type", e.target.value)} />
                      {carerSelect(di, vi, v)}
                      <input className="input sched-in" style={{ fontSize: 11 }} placeholder="Tasks; …" value={v.tasks} onChange={(e) => setV(di, vi, "tasks", e.target.value)} />
                    </div>
                  ))}
                  <button className="mini" style={{ width: "100%", justifyContent: "center" }} onClick={() => addV(di)}>
                    <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>add</span>Add
                  </button>
                  {d.visits.length > 0 && (
                    <button className="sched-copy" title="Copy this day to every other day" onClick={() => copyToAll(di)}>
                      <span className="ms" style={{ fontSize: 13, marginRight: 3 }}>content_copy</span>Copy to all days
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid cols-2">
          {days.map((d, di) => (
            <div key={d.day} className="card">
              <div className="flex between" style={{ marginBottom: 8, alignItems: "center" }}>
                <strong style={{ fontSize: 14 }}>{d.day}</strong>
                <div className="flex" style={{ gap: 6 }}>
                  {d.visits.length > 0 && (
                    <button className="mini" title="Copy this day to every other day" onClick={() => copyToAll(di)}>
                      <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>content_copy</span>Copy to all
                    </button>
                  )}
                  <button className="mini primary" onClick={() => addV(di)}>
                    <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>add</span>Add call
                  </button>
                </div>
              </div>
              {d.visits.length === 0 ? (
                <div className="muted" style={{ fontSize: 12.5, padding: "4px 0" }}>No calls.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {d.visits.map((v, vi) => (
                    <div key={vi} className="sched-visit">
                      <div className="sched-grid">
                        <input className="input sched-in" type="time" value={v.time} onChange={(e) => setV(di, vi, "time", e.target.value)} />
                        <select className="input sched-in" value={v.dur} onChange={(e) => setV(di, vi, "dur", e.target.value)}>
                          {DURATIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                          {!DURATIONS.includes(v.dur) && <option value={v.dur}>{v.dur}</option>}
                        </select>
                        <input className="input sched-in" list="visit-types" value={v.type} placeholder="Type" onChange={(e) => setV(di, vi, "type", e.target.value)} />
                        {carerSelect(di, vi, v)}
                        <button className="task-x" title="Remove call" onClick={() => delV(di, vi)}>
                          <span className="ms" style={{ fontSize: 16 }}>close</span>
                        </button>
                      </div>
                      <input
                        className="input"
                        style={{ fontSize: 12, padding: "6px 9px", marginTop: 6 }}
                        placeholder="Tasks (semicolon-separated) — e.g. Wash & dress; Medication prompt; Breakfast"
                        value={v.tasks}
                        onChange={(e) => setV(di, vi, "tasks", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
