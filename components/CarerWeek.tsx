"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CarerDay, UnassignedCall } from "@/lib/schedule";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// The working day window used to show availability / gaps.
const DAY_START = 7 * 60; // 07:00
const DAY_END = 22 * 60; // 22:00
const DAY_SPAN = DAY_END - DAY_START;
const MIN_GAP = 30; // gaps shorter than this aren't worth offering a call

function hm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}
function clock(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function durMin(d: string) {
  const n = parseInt(d, 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}
function pct(min: number) {
  return Math.max(0, Math.min(100, ((min - DAY_START) / DAY_SPAN) * 100));
}

type Seg = { start: number; end: number; su?: string; type?: string };

/** Merge a day's calls into busy blocks, then the free gaps between them. */
function dayAvailability(day: CarerDay): { busy: Seg[]; gaps: Seg[]; freeMin: number } {
  const blocks = day.visits
    .map((v) => ({ start: v.startMin, end: v.startMin + durMin(v.dur), su: v.su, type: v.type }))
    .sort((a, b) => a.start - b.start);
  // Merge overlaps (double-up calls share a slot).
  const busy: Seg[] = [];
  for (const b of blocks) {
    const last = busy[busy.length - 1];
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
    else busy.push({ ...b });
  }
  const gaps: Seg[] = [];
  let cursor = DAY_START;
  for (const b of busy) {
    if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, DAY_END) });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < DAY_END) gaps.push({ start: cursor, end: DAY_END });
  const usable = gaps.filter((g) => g.end - g.start >= MIN_GAP);
  return { busy, gaps: usable, freeMin: usable.reduce((n, g) => n + (g.end - g.start), 0) };
}

export default function CarerWeek({
  week,
  assign,
}: {
  week: CarerDay[];
  assign?: { carerName: string; candidates: UnassignedCall[] };
}) {
  const router = useRouter();
  const [view, setView] = useState<"cards" | "table" | "avail">("cards");
  const [pending, setPending] = useState<UnassignedCall | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const byDay = new Map(week.map((d) => [d.day, d]));
  const totalMin = week.reduce((n, d) => n + d.minutes, 0);
  const totalCalls = week.reduce((n, d) => n + d.visits.length, 0);
  const allTimes = [...new Set(week.flatMap((d) => d.visits.map((v) => v.time)))].sort();
  const avail = WEEK.map((day) => ({ day, ...dayAvailability(byDay.get(day) ?? { day, visits: [], minutes: 0 }) }));
  const freeTotal = avail.reduce((n, a) => n + a.freeMin, 0);

  // Unassigned calls that fit inside one of this carer's free gaps, by day.
  const candidatesByDay = new Map<string, UnassignedCall[]>();
  if (assign) {
    const gapsByDay = new Map(avail.map((a) => [a.day, a.gaps]));
    for (const c of assign.candidates) {
      const gaps = gapsByDay.get(c.day) ?? [];
      const end = c.startMin + c.durMin;
      const fits = gaps.some((g) => c.startMin >= g.start && end <= g.end);
      if (!fits) continue;
      if (!candidatesByDay.has(c.day)) candidatesByDay.set(c.day, []);
      candidatesByDay.get(c.day)!.push(c);
    }
  }
  const fillableCount = [...candidatesByDay.values()].reduce((n, arr) => n + arr.length, 0);

  async function assignCall(c: UnassignedCall) {
    if (!assign) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", clientId: c.clientId, day: c.day, time: c.time, carer: assign.carerName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? "Could not assign the call."); return; }
      setPending(null);
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex between wrap" style={{ gap: 10, marginBottom: 12, alignItems: "center" }}>
        <div className="flex wrap" style={{ gap: 8 }}>
          <span className="pill tone-blue"><span className="ms" style={{ fontSize: 14 }}>event</span>{totalCalls} calls this week</span>
          <span className="pill tone-green"><span className="ms" style={{ fontSize: 14 }}>schedule</span>{hm(totalMin)} scheduled</span>
        </div>
        <div className="flex" style={{ gap: 6 }}>
          {([["cards", "Cards"], ["table", "Table"], ["avail", "Availability"]] as const).map(([m, label]) => (
            <button key={m} className={`chip${view === m ? " active" : ""}`} onClick={() => setView(m)}>{label}</button>
          ))}
        </div>
      </div>

      {view === "avail" ? (
        <div className="card">
          <div className="flex between wrap" style={{ gap: 8, marginBottom: 10, alignItems: "center" }}>
            <p className="muted" style={{ fontSize: 12.5, margin: 0, maxWidth: "62ch" }}>
              Free windows in the working day (07:00–22:00) where an extra call could be assigned — booked calls are solid, open gaps are highlighted.
              {assign && fillableCount > 0 && <> Amber calls are <strong>unassigned client calls in this carer&apos;s radius</strong> that land in a gap — click one to assign it.</>}
            </p>
            <span className="pill tone-green"><span className="ms" style={{ fontSize: 14 }}>event_available</span>{hm(freeTotal)} open this week</span>
          </div>

          {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}

          {pending && assign && (
            <div className="card" style={{ background: "var(--amber-bg)", borderColor: "var(--amber-fg)", marginBottom: 10 }}>
              <div className="flex between wrap" style={{ gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 13 }}>
                  Assign <strong>{assign.carerName}</strong> to <strong>{pending.su}</strong> · {pending.type} · {pending.day} {pending.time} ({pending.dur})?
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>This week only (a cover assignment) · {pending.area}</div>
                </div>
                <div className="flex" style={{ gap: 8 }}>
                  <button className="mini primary" disabled={busy} onClick={() => assignCall(pending)}>{busy ? "Assigning…" : "Assign this week"}</button>
                  <button className="mini" disabled={busy} onClick={() => setPending(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="avail-scale">
            <span>07:00</span><span>10:00</span><span>13:00</span><span>16:00</span><span>19:00</span><span>22:00</span>
          </div>
          {avail.map((a) => {
            const cands = candidatesByDay.get(a.day) ?? [];
            return (
              <div key={a.day} className="avail-row">
                <div className="avail-label">
                  <strong style={{ fontSize: 12.5 }}>{a.day.slice(0, 3)}</strong>
                  <span className="muted" style={{ fontSize: 11 }}>{a.freeMin === DAY_SPAN ? "all day" : a.freeMin ? `${hm(a.freeMin)} free` : "full"}</span>
                </div>
                <div className="avail-bar">
                  {a.busy.map((b, i) => (
                    <div key={`b${i}`} className="avail-busy" style={{ left: `${pct(b.start)}%`, width: `${pct(b.end) - pct(b.start)}%` }} title={`${clock(b.start)}–${clock(b.end)} · ${b.su}`}>
                      {pct(b.end) - pct(b.start) > 7 ? b.su : ""}
                    </div>
                  ))}
                  {a.gaps.map((g, i) => (
                    <div key={`g${i}`} className="avail-gap" style={{ left: `${pct(g.start)}%`, width: `${pct(g.end) - pct(g.start)}%` }} title={`Free ${clock(g.start)}–${clock(g.end)} (${hm(g.end - g.start)})`}>
                      {pct(g.end) - pct(g.start) > 12 ? `${hm(g.end - g.start)} free` : ""}
                    </div>
                  ))}
                  {cands.map((c, i) => {
                    const w = Math.max(pct(c.startMin + c.durMin) - pct(c.startMin), 2.2);
                    return (
                      <button key={`c${i}`} className="avail-open" style={{ left: `${pct(c.startMin)}%`, width: `${w}%` }}
                        title={`Unassigned: ${c.su} · ${c.type} · ${c.time} (${c.dur}) — click to assign`} onClick={() => { setErr(""); setPending(c); }}>
                        <span className="ms" style={{ fontSize: 12 }}>add</span>{w > 6 ? c.su : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex wrap" style={{ gap: 14, marginTop: 12, fontSize: 11.5 }}>
            <span className="flex" style={{ gap: 5, alignItems: "center" }}><span className="avail-key busy" />Booked call</span>
            <span className="flex" style={{ gap: 5, alignItems: "center" }}><span className="avail-key gap" />Open — can assign</span>
            {assign && <span className="flex" style={{ gap: 5, alignItems: "center" }}><span className="avail-key open" />Unassigned call to fill{fillableCount > 0 ? ` · ${fillableCount}` : ""}</span>}
          </div>
        </div>
      ) : totalCalls === 0 ? (
        <div className="card muted" style={{ fontSize: 13 }}>No calls scheduled this week — available all week.</div>
      ) : view === "table" ? (
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
                    const v = byDay.get(day)?.visits.find((x) => x.time === t);
                    if (!v) return <td key={day} className="muted" style={{ textAlign: "center" }}>·</td>;
                    return (
                      <td key={day}>
                        <div style={{ fontWeight: 600, fontSize: 11.5 }}>{v.type}</div>
                        <div style={{ fontSize: 11, color: "var(--text-2)" }}>{v.su} · {v.area}</div>
                        {v.cover && <span className="pill tone-amber" style={{ fontSize: 10, marginTop: 2 }}>cover</span>}
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
            const d = byDay.get(day);
            const visits = d?.visits ?? [];
            return (
              <div key={day} className="card">
                <div className="flex between" style={{ alignItems: "center" }}>
                  <strong style={{ fontSize: 14 }}>{day}</strong>
                  {visits.length > 0 && <span className="muted" style={{ fontSize: 11.5 }}>{visits.length} · {hm(d!.minutes)}</span>}
                </div>
                {visits.length === 0 ? (
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>Off — no calls.</div>
                ) : (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                    {visits.map((v, i) => (
                      <div key={i} className="sched-visit">
                        <div className="flex" style={{ gap: 8, fontSize: 13, alignItems: "center", flexWrap: "wrap" }}>
                          <span className="code">{v.time}</span>
                          <strong>{v.type}</strong>
                          <span className="muted">{v.dur}</span>
                          {v.cover && <span className="pill tone-amber" style={{ marginLeft: "auto" }}><span className="ms" style={{ fontSize: 13 }}>swap_horiz</span>Cover</span>}
                        </div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                          <span className="ms" style={{ fontSize: 13, verticalAlign: "middle" }}>person</span> {v.maskedName} · <span className="code">{v.su}</span> · {v.area}
                        </div>
                        {v.tasks.length > 0 && <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{v.tasks.join(" · ")}</div>}
                      </div>
                    ))}
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
