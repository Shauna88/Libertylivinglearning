"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Empty from "@/components/Empty";
import type { WorkforceSummary } from "@/lib/attendanceServer";

const EXC_META: Record<string, { label: string; tone: string; icon: string }> = {
  no_show: { label: "No clock-in", tone: "red", icon: "error" },
  under_delivered: { label: "Under-delivered", tone: "amber", icon: "hourglass_bottom" },
  late_in: { label: "Late clock-in", tone: "amber", icon: "running_with_errors" },
};

function hrs(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h}h${m ? ` ${String(m).padStart(2, "0")}m` : ""}`;
}
function weekLabel(a: string, b: string) {
  const d = (s: string) => new Date(`${s}T12:00:00Z`).toLocaleDateString("en-IE", { day: "numeric", month: "short" });
  return `${d(a)} – ${d(b)}`;
}
function dayShort(dateIso: string) {
  return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });
}

export default function AttendanceHub() {
  const [sum, setSum] = useState<WorkforceSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showExc, setShowExc] = useState(false);

  async function fetchWeek(week: string) {
    try {
      const res = await fetch(`/api/attendance/summary?week=${week}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: data.error ?? "Could not load that week." };
      return { summary: data.summary as WorkforceSummary };
    } catch {
      return { error: "Network error — please try again." };
    }
  }
  async function load(week: string) {
    setBusy(true); setErr("");
    const r = await fetchWeek(week);
    if (r.error) setErr(r.error); else setSum(r.summary!);
    setBusy(false);
  }
  useEffect(() => {
    let live = true;
    fetchWeek(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" })).then((r) => {
      if (!live) return;
      if (r.error) setErr(r.error); else setSum(r.summary ?? null);
    });
    return () => { live = false; };
  }, []);

  const shift = (delta: number) => {
    if (!sum) return;
    const base = new Date(`${sum.weekStart}T12:00:00Z`);
    load(new Date(base.getTime() + delta * 7 * 86_400_000).toISOString().slice(0, 10));
  };

  if (!sum) {
    return <div className="card" style={{ textAlign: "center", padding: 28 }}><span className="muted">{err || "Loading workforce timesheet…"}</span></div>;
  }

  const t = sum.totals;
  const pct = t.plannedMin > 0 ? Math.round((t.deliveredMin / t.plannedMin) * 100) : 0;

  return (
    <div className="att">
      <div className="att-nav">
        <button className="btn" style={{ padding: "6px 10px" }} disabled={busy} onClick={() => shift(-1)} aria-label="Previous week"><span className="ms">chevron_left</span></button>
        <div className="att-nav-week">
          <div style={{ fontWeight: 800, fontSize: 15 }}>{weekLabel(sum.weekStart, sum.weekEnd)}</div>
          <div className="muted" style={{ fontSize: 11.5 }}>Workforce timesheet</div>
        </div>
        <button className="btn" style={{ padding: "6px 10px" }} disabled={busy} onClick={() => shift(1)} aria-label="Next week"><span className="ms">chevron_right</span></button>
        <button className="btn" style={{ padding: "6px 12px", fontSize: 12.5 }} disabled={busy} onClick={() => load(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" }))}>This week</button>
        <a className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12.5, marginLeft: "auto" }} href={`/api/attendance/export?scope=workforce&week=${sum.weekStart}`}>
          <span className="ms" style={{ fontSize: 16 }}>download</span>Export CSV
        </a>
      </div>

      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 10 }}>{err}</div>}

      <div className="att-totals">
        <div className="att-tot"><div className="att-tot-n">{hrs(t.deliveredMin)}</div><div className="att-tot-l">Delivered</div></div>
        <div className="att-tot"><div className="att-tot-n muted">{hrs(t.plannedMin)}</div><div className="att-tot-l">Planned</div></div>
        <div className="att-tot"><div className="att-tot-n" style={{ color: pct >= 95 ? "var(--green-fg)" : pct >= 80 ? "var(--amber-fg)" : "var(--red-fg)" }}>{pct}%</div><div className="att-tot-l">Delivered vs plan</div></div>
        <div className="att-tot"><div className="att-tot-n">{sum.carers.length}</div><div className="att-tot-l">Carers</div></div>
        <div className="att-tot"><div className="att-tot-n" style={{ color: "var(--green-fg)" }}>{t.completed}</div><div className="att-tot-l">Completed</div></div>
        <div className="att-tot"><div className="att-tot-n" style={{ color: sum.exceptions.length ? "var(--red-fg)" : undefined }}>{sum.exceptions.length}</div><div className="att-tot-l">Exceptions</div></div>
      </div>

      {/* exceptions */}
      {sum.exceptions.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid var(--red-fg)" }}>
          <button className="section-toggle" style={{ padding: 0, width: "100%" }} onClick={() => setShowExc((s) => !s)} aria-expanded={showExc}>
            <span className="ms" style={{ fontSize: 18 }}>{showExc ? "expand_more" : "chevron_right"}</span>
            <span className="ms" style={{ fontSize: 16, color: "var(--red-fg)" }}>report</span>
            <strong style={{ fontSize: 13.5 }}>Exceptions this week</strong>
            <span className="pill tone-red" style={{ marginLeft: 6 }}>{sum.exceptions.length}</span>
            <span className="muted" style={{ fontSize: 12, marginLeft: 4 }}>· {t.noShow} no clock-in</span>
          </button>
          {showExc && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {sum.exceptions.slice(0, 40).map((e, i) => {
                const m = EXC_META[e.kind];
                return (
                  <div key={i} className="flex between wrap" style={{ gap: 8, fontSize: 12.5, borderTop: i ? "1px solid var(--line)" : "none", paddingTop: i ? 6 : 0 }}>
                    <span className="flex" style={{ gap: 8, alignItems: "center", minWidth: 0 }}>
                      <span className={`pill tone-${m.tone}`} style={{ fontSize: 10.5 }}><span className="ms" style={{ fontSize: 12 }}>{m.icon}</span>{m.label}</span>
                      <Link href={`/carers/${e.carerId}`} style={{ fontWeight: 600 }}>{e.carer}</Link>
                      <span className="muted">{dayShort(e.date)} {e.time} · {e.subject}</span>
                    </span>
                    <span className="muted" style={{ fontSize: 11.5 }}>{e.detail}</span>
                  </div>
                );
              })}
              {sum.exceptions.length > 40 && <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>+{sum.exceptions.length - 40} more — export the CSV for the full list.</div>}
            </div>
          )}
        </div>
      )}

      {/* per-carer timesheet */}
      {sum.carers.length === 0 ? (
        <Empty icon="event_busy" title="No rostered calls this week" hint="Pick another week with the arrows above." />
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Carer</th>
                <th style={{ width: 200 }}>Delivered vs planned</th>
                <th style={{ width: 70 }}>Calls</th>
                <th style={{ width: 90 }}>Completed</th>
                <th style={{ width: 90 }}>No clock-in</th>
                <th style={{ width: 90 }}>Exceptions</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sum.carers.map((c) => {
                const p = c.totals.plannedMin > 0 ? Math.round((c.totals.deliveredMin / c.totals.plannedMin) * 100) : 0;
                const tone = p >= 95 ? "green" : p >= 80 ? "amber" : "red";
                return (
                  <tr key={c.carerId}>
                    <td><Link href={`/carers/${c.carerId}`} style={{ fontWeight: 600 }}>{c.name}</Link><div className="code" style={{ fontSize: 10.5 }}>{c.carerId}</div></td>
                    <td>
                      <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 70, height: 8, borderRadius: 5, background: "var(--grey-bg)", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, p)}%`, height: "100%", background: `var(--${tone}-fg)` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{hrs(c.totals.deliveredMin)}</span>
                        <span className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>/ {hrs(c.totals.plannedMin)}</span>
                      </div>
                    </td>
                    <td>{c.totals.calls}</td>
                    <td><span className="pill tone-green" style={{ fontSize: 11 }}>{c.totals.completed}</span></td>
                    <td>{c.totals.noShow > 0 ? <span className="pill tone-red" style={{ fontSize: 11 }}>{c.totals.noShow}</span> : <span className="muted">0</span>}</td>
                    <td>{c.exceptions > 0 ? <span className="pill tone-amber" style={{ fontSize: 11 }}>{c.exceptions}</span> : <span className="muted">—</span>}</td>
                    <td style={{ textAlign: "right" }}><Link href={`/carers/${c.carerId}`} className="muted" aria-label="Open carer"><span className="ms">chevron_right</span></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
        Delivered hours are the actual point-of-care check-in / check-out, stored per date. Export the CSV for payroll or an HSE query; open any carer for their full weekly timesheet.
      </p>
    </div>
  );
}
