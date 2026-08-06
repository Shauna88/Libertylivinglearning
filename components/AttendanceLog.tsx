"use client";

import { useEffect, useState } from "react";
import Empty from "@/components/Empty";
import type { AttWeek, AttState } from "@/lib/attendance";

const STATE_META: Record<AttState, { label: string; tone: string; icon: string }> = {
  completed: { label: "Completed", tone: "green", icon: "task_alt" },
  onsite: { label: "On site", tone: "blue", icon: "person_pin_circle" },
  no_show: { label: "No clock-in", tone: "red", icon: "error" },
  upcoming: { label: "Upcoming", tone: "grey", icon: "schedule" },
  unassigned: { label: "Unassigned", tone: "red", icon: "person_alert" },
};

function hhmm(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hour12: false });
}
function hrs(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h}h${m ? ` ${String(m).padStart(2, "0")}m` : ""}`;
}
function weekLabel(startIso: string, endIso: string) {
  const d = (s: string) => new Date(`${s}T12:00:00Z`).toLocaleDateString("en-IE", { day: "numeric", month: "short" });
  return `${d(startIso)} – ${d(endIso)}`;
}
function dayLabel(dateIso: string) {
  return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short" });
}

/**
 * Weekly attendance / timesheet — planned Schedule of Service vs the actual
 * clock-in / clock-out, with per-day and whole-week totals. Navigate back to any
 * past week for payroll, HSE queries or an audit. Print for a paper record.
 */
export default function AttendanceLog({ scope, id }: { scope: "client" | "carer"; id: string }) {
  const [week, setWeek] = useState<AttWeek | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function fetchWeek(weekStart: string): Promise<{ week?: AttWeek; error?: string }> {
    try {
      const res = await fetch(`/api/attendance?scope=${scope}&id=${encodeURIComponent(id)}&week=${weekStart}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: data.error ?? "Could not load that week." };
      return { week: data.week as AttWeek };
    } catch {
      return { error: "Network error — please try again." };
    }
  }

  async function load(weekStart: string) {
    setBusy(true);
    setErr("");
    const r = await fetchWeek(weekStart);
    if (r.error) setErr(r.error); else setWeek(r.week!);
    setBusy(false);
  }

  // Load the current week on mount (state is set only after the fetch resolves).
  useEffect(() => {
    let live = true;
    fetchWeek(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" })).then((r) => {
      if (!live) return;
      if (r.error) setErr(r.error); else setWeek(r.week ?? null);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, id]);

  if (!week) {
    return <div className="card" style={{ textAlign: "center", padding: 24 }} aria-busy="true"><span className="muted">{err || "Loading attendance…"}</span></div>;
  }

  const shift = (deltaWeeks: number) => {
    const base = new Date(`${week.weekStart}T12:00:00Z`);
    load(new Date(base.getTime() + deltaWeeks * 7 * 86_400_000).toISOString().slice(0, 10));
  };

  const t = week.totals;
  const deliveredPct = t.plannedMin > 0 ? Math.round((t.deliveredMin / t.plannedMin) * 100) : 0;
  const whoLabel = scope === "client" ? "Carer" : "Client";

  return (
    <div className="att">
      {/* week navigator */}
      <div className="att-nav">
        <button className="btn" style={{ padding: "6px 10px" }} disabled={busy} onClick={() => shift(-1)} aria-label="Previous week">
          <span className="ms">chevron_left</span>
        </button>
        <div className="att-nav-week">
          <div style={{ fontWeight: 800, fontSize: 15 }}>{weekLabel(week.weekStart, week.weekEnd)}</div>
          <div className="muted" style={{ fontSize: 11.5 }}>Week beginning {new Date(`${week.weekStart}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "long" })}</div>
        </div>
        <button className="btn" style={{ padding: "6px 10px" }} disabled={busy} onClick={() => shift(1)} aria-label="Next week">
          <span className="ms">chevron_right</span>
        </button>
        <button className="btn" style={{ padding: "6px 12px", fontSize: 12.5 }} disabled={busy} onClick={() => load(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" }))}>This week</button>
        <a className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12.5, marginLeft: "auto" }} href={`/api/attendance/export?scope=${scope}&id=${encodeURIComponent(id)}&week=${week.weekStart}`}>
          <span className="ms" style={{ fontSize: 16 }}>download</span>Export CSV
        </a>
        <button className="btn" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => window.print()}>
          <span className="ms" style={{ fontSize: 16 }}>print</span>Print
        </button>
      </div>

      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}

      {/* weekly totals — the payroll / audit summary */}
      <div className="att-totals">
        <div className="att-tot"><div className="att-tot-n">{hrs(t.deliveredMin)}</div><div className="att-tot-l">Delivered</div></div>
        <div className="att-tot"><div className="att-tot-n muted">{hrs(t.plannedMin)}</div><div className="att-tot-l">Planned</div></div>
        <div className="att-tot">
          <div className="att-tot-n" style={{ color: deliveredPct >= 95 ? "var(--green-fg)" : deliveredPct >= 80 ? "var(--amber-fg)" : "var(--red-fg)" }}>{deliveredPct}%</div>
          <div className="att-tot-l">Delivered vs plan</div>
        </div>
        <div className="att-tot"><div className="att-tot-n" style={{ color: "var(--green-fg)" }}>{t.completed}</div><div className="att-tot-l">Completed</div></div>
        <div className="att-tot"><div className="att-tot-n" style={{ color: t.noShow ? "var(--red-fg)" : undefined }}>{t.noShow}</div><div className="att-tot-l">No clock-in</div></div>
        <div className="att-tot"><div className="att-tot-n">{t.calls}</div><div className="att-tot-l">Calls</div></div>
      </div>

      {t.calls === 0 ? (
        <Empty icon="event_busy" title="No calls scheduled this week" hint="Pick another week with the arrows above." />
      ) : (
        <div className="att-days">
          {week.days.filter((d) => d.visits.length > 0).map((d) => (
            <div key={d.date} className="att-day">
              <div className="att-day-head">
                <strong style={{ fontSize: 13 }}>{dayLabel(d.date)}</strong>
                <span className="muted" style={{ fontSize: 11.5 }}>{hrs(d.deliveredMin)} of {hrs(d.plannedMin)}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl att-table">
                  <thead>
                    <tr>
                      <th style={{ width: 64 }}>Plan</th>
                      <th>Visit</th>
                      <th>{whoLabel}</th>
                      <th style={{ width: 130 }}>Actual</th>
                      <th style={{ width: 96 }}>Delivered</th>
                      <th style={{ width: 150 }}>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.visits.map((v, i) => {
                      const sm = STATE_META[v.state];
                      const late = v.lateInMin;
                      return (
                        <tr key={i}>
                          <td><span className="code">{v.time}</span><div className="muted" style={{ fontSize: 10.5 }}>{hrs(v.plannedMin)}</div></td>
                          <td>{v.type}</td>
                          <td className="muted">{v.who}</td>
                          <td style={{ fontSize: 12 }}>
                            {v.checkinAt ? (
                              <>
                                <span style={{ color: "var(--green-fg)", fontWeight: 600 }}>{hhmm(v.checkinAt)}</span>
                                {v.checkoutAt ? <> → {hhmm(v.checkoutAt)}</> : v.state === "onsite" ? " → on site" : ""}
                                {late != null && Math.abs(late) > 2 && (
                                  <div style={{ fontSize: 10.5, color: late > 0 ? "var(--amber-fg)" : "var(--text-2)" }}>{late > 0 ? `${late}m late in` : `${-late}m early in`}</div>
                                )}
                              </>
                            ) : <span className="muted">—</span>}
                          </td>
                          <td>
                            {v.deliveredMin != null ? (
                              <>
                                <strong style={{ fontSize: 12 }}>{hrs(v.deliveredMin)}</strong>
                                {v.varianceMin != null && Math.abs(v.varianceMin) > 2 && (
                                  <div style={{ fontSize: 10.5, color: v.varianceMin < 0 ? "var(--amber-fg)" : "var(--text-2)" }}>{v.varianceMin > 0 ? `+${v.varianceMin}m` : `${v.varianceMin}m`}</div>
                                )}
                              </>
                            ) : <span className="muted">—</span>}
                          </td>
                          <td><span className={`pill tone-${sm.tone}`}><span className="ms" style={{ fontSize: 13 }}>{sm.icon}</span>{sm.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
        Actual times are point-of-care check-in / check-out, stored per date — this record is retained for payroll, HSE queries and audit. Planned hours come from the current Schedule of Service.
      </p>
    </div>
  );
}
