"use client";

import { useState } from "react";
import type { CarerDay } from "@/lib/schedule";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function hm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}

export default function CarerWeek({ week }: { week: CarerDay[] }) {
  const [view, setView] = useState<"cards" | "table">("cards");

  const byDay = new Map(week.map((d) => [d.day, d]));
  const totalMin = week.reduce((n, d) => n + d.minutes, 0);
  const totalCalls = week.reduce((n, d) => n + d.visits.length, 0);
  const allTimes = [...new Set(week.flatMap((d) => d.visits.map((v) => v.time)))].sort();

  return (
    <div>
      <div className="flex between wrap" style={{ gap: 10, marginBottom: 12, alignItems: "center" }}>
        <div className="flex wrap" style={{ gap: 8 }}>
          <span className="pill tone-blue"><span className="ms" style={{ fontSize: 14 }}>event</span>{totalCalls} calls this week</span>
          <span className="pill tone-green"><span className="ms" style={{ fontSize: 14 }}>schedule</span>{hm(totalMin)} scheduled</span>
        </div>
        <div className="flex" style={{ gap: 6 }}>
          {(["cards", "table"] as const).map((m) => (
            <button key={m} className={`chip${view === m ? " active" : ""}`} onClick={() => setView(m)}>{m === "cards" ? "Cards" : "Table"}</button>
          ))}
        </div>
      </div>

      {totalCalls === 0 ? (
        <div className="card muted" style={{ fontSize: 13 }}>You have no calls scheduled this week.</div>
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
