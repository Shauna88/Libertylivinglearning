"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScheduleDay } from "@/lib/crm";

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
}: {
  clientId: string;
  schedule: ScheduleDay[];
  carers: string[];
}) {
  const router = useRouter();
  const [days, setDays] = useState<EditDay[]>(() => toEdit(schedule));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const carerOptions = [UN, ...carers.filter((c) => !/unassigned/i.test(c))];

  function mutate(fn: (d: EditDay[]) => EditDay[]) {
    setDays((prev) => fn(structuredClone(prev)));
    setDirty(true);
    setSaved(false);
  }
  const setV = (di: number, vi: number, k: keyof EditVisit, val: string) =>
    mutate((d) => { d[di].visits[vi][k] = val; return d; });
  const addV = (di: number) =>
    mutate((d) => { d[di].visits.push({ time: "09:00", dur: "30m", type: "Personal care", carer: UN, tasks: "" }); return d; });
  const delV = (di: number, vi: number) =>
    mutate((d) => { d[di].visits.splice(vi, 1); return d; });

  const totalCalls = days.reduce((n, d) => n + d.visits.length, 0);

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

      <div className="grid cols-2">
        {days.map((d, di) => (
          <div key={d.day} className="card">
            <div className="flex between" style={{ marginBottom: 8, alignItems: "center" }}>
              <strong style={{ fontSize: 14 }}>{d.day}</strong>
              <button className="mini primary" onClick={() => addV(di)}>
                <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>add</span>Add call
              </button>
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
                      <select className="input sched-in" value={v.carer} onChange={(e) => setV(di, vi, "carer", e.target.value)}>
                        {carerOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        {v.carer && !carerOptions.includes(v.carer) && <option value={v.carer}>{v.carer}</option>}
                      </select>
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
    </div>
  );
}
