"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type RosterVisit = {
  key: string;
  clientId: string;
  su: string;
  area: string;
  maskedName: string;
  day: string;
  time: string;
  startMin: number;
  durMin: number;
  type: string;
  carer: string;
  baseCarer: string;
  overridden: boolean;
  unassigned: boolean;
  statusLabel: string;
  tone: string;
};

export type PendingReq = {
  id: number;
  clientId: string;
  day: string;
  time: string;
  carer: string;
  note: string;
  requestedBy: string;
};

const UNASSIGNED = "Unassigned";

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}
function minToLabel(min: number) {
  const h = Math.floor(min / 60);
  return `${String(h).padStart(2, "0")}:00`;
}

export default function RosterBoard({
  day,
  today,
  week,
  visits,
  carerPool,
  pending,
  isCsm,
}: {
  day: string;
  today: string;
  week: string[];
  visits: RosterVisit[];
  carerPool: string[];
  pending: PendingReq[];
  isCsm: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [permFor, setPermFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, url: string, body: unknown) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Something went wrong.");
      } else {
        startTransition(() => router.refresh());
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(null);
      setPermFor(null);
      setNote("");
    }
  }

  const reassign = (v: RosterVisit, carer: string) =>
    act(v.key, "/api/cover", { action: "set", clientId: v.clientId, day: v.day, time: v.time, carer });
  const revert = (v: RosterVisit) =>
    act(v.key, "/api/cover", { action: "clear", clientId: v.clientId, day: v.day, time: v.time });
  const requestPerm = (v: RosterVisit) =>
    act(v.key, "/api/perm-req", { action: "create", clientId: v.clientId, day: v.day, time: v.time, carer: v.carer, note });
  const decide = (id: number, approve: boolean) => act(`req-${id}`, "/api/perm-req", { action: "decide", id, approve });

  const gaps = visits.filter((v) => v.unassigned);
  const assigned = visits.filter((v) => !v.unassigned);
  const pendKey = (p: PendingReq) => `${p.clientId}|${p.day}|${p.time}`;
  const pendingSet = new Map(pending.map((p) => [pendKey(p), p]));

  // ---- timeline axis + lanes ----
  const { axisStart, axisEnd, ticks } = useMemo(() => {
    if (visits.length === 0) return { axisStart: 7 * 60, axisEnd: 22 * 60, ticks: [] as number[] };
    let lo = Math.min(...visits.map((v) => v.startMin));
    let hi = Math.max(...visits.map((v) => v.startMin + v.durMin));
    lo = Math.floor(lo / 60) * 60;
    hi = Math.ceil(hi / 60) * 60;
    if (hi - lo < 120) hi = lo + 120;
    const step = hi - lo > 10 * 60 ? 120 : 60;
    const t: number[] = [];
    for (let x = lo; x <= hi; x += step) t.push(x);
    return { axisStart: lo, axisEnd: hi, ticks: t };
  }, [visits]);
  const span = axisEnd - axisStart || 1;
  const pct = (v: number) => ((v - axisStart) / span) * 100;

  // carers working (from assigned visits), each with their blocks
  const carerLanes = useMemo(() => {
    const map = new Map<string, RosterVisit[]>();
    for (const v of assigned) {
      const key = v.carer;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return [...map.entries()]
      .map(([carer, vs]) => ({ carer, vs, mins: vs.reduce((n, x) => n + x.durMin, 0) }))
      .sort((a, b) => a.carer.localeCompare(b.carer));
  }, [assigned]);

  // ---- staff availability: booked load + whether free at a given interval ----
  const bookedBy = useMemo(() => {
    const map = new Map<string, RosterVisit[]>();
    for (const c of carerPool) map.set(c, []);
    for (const v of assigned) {
      if (!map.has(v.carer)) map.set(v.carer, []);
      map.get(v.carer)!.push(v);
    }
    return map;
  }, [assigned, carerPool]);

  const freeAt = (carer: string, start: number, dur: number) => {
    const end = start + dur;
    const blocks = bookedBy.get(carer) ?? [];
    return !blocks.some((b) => start < b.startMin + b.durMin && b.startMin < end);
  };
  const suggestFor = (v: RosterVisit) =>
    carerPool
      .filter((c) => freeAt(c, v.startMin, v.durMin))
      .map((c) => ({ c, load: (bookedBy.get(c) ?? []).length }))
      .sort((a, b) => a.load - b.load)
      .slice(0, 3)
      .map((x) => x.c);

  const availability = useMemo(
    () =>
      carerPool
        .map((c) => {
          const blocks = (bookedBy.get(c) ?? []).slice().sort((a, b) => a.startMin - b.startMin);
          const mins = blocks.reduce((n, x) => n + x.durMin, 0);
          return { carer: c, count: blocks.length, mins, blocks };
        })
        .sort((a, b) => a.count - b.count || a.carer.localeCompare(b.carer)),
    [carerPool, bookedBy]
  );

  const carerOptions = (v: RosterVisit) => {
    const opts = new Set<string>([UNASSIGNED, ...carerPool]);
    if (v.carer && !opts.has(v.carer)) opts.add(v.carer);
    return [...opts];
  };

  const summary = [
    { icon: "event", label: "Calls today", value: visits.length, tone: "blue" },
    { icon: "person_alert", label: "Unassigned", value: gaps.length, tone: gaps.length ? "red" : "green" },
    { icon: "badge", label: "Carers working", value: carerLanes.length, tone: "teal" },
    { icon: "schedule", label: "Booked hours", value: fmtHours(assigned.reduce((n, v) => n + v.durMin, 0)), tone: "green" },
  ];

  function Block({ v, showCarer }: { v: RosterVisit; showCarer?: boolean }) {
    return (
      <div
        className={`tl-block tl-${v.unassigned ? "red" : v.tone}`}
        style={{ left: `${pct(v.startMin)}%`, width: `${Math.max(3, (v.durMin / span) * 100)}%` }}
        title={`${v.time} ${v.type} · ${showCarer ? v.carer : v.su}`}
      >
        <div className="tl-time">{v.time}</div>
        <div className="tl-sub">{showCarer ? v.carer : v.su}</div>
      </div>
    );
  }

  function GapRow({ v }: { v: RosterVisit }) {
    const isBusy = busy === v.key;
    const suggestions = suggestFor(v);
    return (
      <div className="gap-row">
        <div className="gap-when">
          <strong>{v.time}</strong>
          <span className="muted">{v.durMin}m</span>
        </div>
        <div className="gap-what">
          <strong>{v.type}</strong>
          <span className="muted" style={{ fontSize: 12 }}>{v.su} · {v.area}</span>
        </div>
        <div className="gap-assign">
          {suggestions.length > 0 && (
            <div className="gap-suggest">
              <span className="muted" style={{ fontSize: 11 }}>Free now:</span>
              {suggestions.map((c) => (
                <button key={c} className="chip-suggest" disabled={isBusy} onClick={() => reassign(v, c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <select className="rv-select" value={UNASSIGNED} disabled={isBusy} onChange={(e) => reassign(v, e.target.value)}>
            {carerOptions(v).map((c) => (
              <option key={c} value={c}>{c === UNASSIGNED ? "Assign a carer…" : c}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="body fade">
      {error && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)" }}>{error}</div>}

      {/* day tabs */}
      <div className="daybar">
        {week.map((d) => (
          <Link key={d} href={`/roster?day=${d}`} className={`daytab${d === day ? " active" : ""}`}>
            {d.slice(0, 3)}
            {d === today && <span className="dot-today" title="Today" />}
          </Link>
        ))}
      </div>

      {/* CSM approvals */}
      {isCsm && pending.length > 0 && (
        <div className="card approvals">
          <div className="section-title" style={{ marginTop: 0 }}>
            Permanent-change requests — {pending.length} awaiting your approval
          </div>
          {pending.map((p) => (
            <div key={p.id} className="approval">
              <div style={{ minWidth: 0 }}>
                <strong>{p.carer}</strong> on <span className="code">{p.clientId}</span> · {p.day} {p.time}
                <div className="muted" style={{ fontSize: 12.5 }}>{p.note} <span style={{ opacity: 0.7 }}>— {p.requestedBy}</span></div>
              </div>
              <div className="flex" style={{ gap: 8 }}>
                <button className="mini primary" disabled={busy === `req-${p.id}`} onClick={() => decide(p.id, true)}>Approve</button>
                <button className="mini" disabled={busy === `req-${p.id}`} onClick={() => decide(p.id, false)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* summary tiles */}
      <div className="grid cols-4" style={{ marginBottom: 4 }}>
        {summary.map((k) => (
          <div key={k.label} className="card tl-summary">
            <div className="tl-ic" style={{ background: `var(--${k.tone}-bg)`, color: `var(--${k.tone}-fg)` }}>
              <span className="ms" style={{ fontSize: 20 }}>{k.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{k.value}</div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* gaps to cover */}
      {gaps.length > 0 && (
        <>
          <div className="section-title">Unassigned calls — {gaps.length} to cover</div>
          <div className="card" style={{ borderLeft: "4px solid var(--red-fg)" }}>
            {gaps.map((v) => (
              <GapRow key={v.key} v={v} />
            ))}
          </div>
        </>
      )}

      {/* timeline */}
      <div className="section-title">Who&rsquo;s working — {day}</div>
      {visits.length === 0 ? (
        <div className="card muted">No calls scheduled for {day}.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <div className="tl">
            {/* axis */}
            <div className="tl-row tl-axis">
              <div className="tl-lane-label">Carer</div>
              <div className="tl-track">
                {ticks.map((t) => (
                  <div key={t} className="tl-tick" style={{ left: `${pct(t)}%` }}>
                    <span>{minToLabel(t)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* unassigned lane */}
            {gaps.length > 0 && (
              <div className="tl-row tl-unassigned">
                <div className="tl-lane-label">
                  <span className="ms" style={{ fontSize: 16, color: "var(--red-fg)" }}>person_alert</span>
                  <span style={{ color: "var(--red-fg)", fontWeight: 700 }}>Unassigned</span>
                </div>
                <div className="tl-track">
                  {ticks.map((t) => <div key={t} className="tl-grid" style={{ left: `${pct(t)}%` }} />)}
                  {gaps.map((v) => <Block key={v.key} v={v} />)}
                </div>
              </div>
            )}
            {/* carer lanes */}
            {carerLanes.map((lane) => (
              <div key={lane.carer} className="tl-row">
                <div className="tl-lane-label">
                  <div style={{ minWidth: 0 }}>
                    <div className="tl-name">{lane.carer}</div>
                    <div className="muted" style={{ fontSize: 10 }}>{lane.vs.length} calls · {fmtHours(lane.mins)}</div>
                  </div>
                </div>
                <div className="tl-track">
                  {ticks.map((t) => <div key={t} className="tl-grid" style={{ left: `${pct(t)}%` }} />)}
                  {lane.vs.map((v) => <Block key={v.key} v={v} showCarer={false} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* staff availability */}
      <div className="section-title">Staff availability — spare capacity</div>
      <div className="grid cols-3">
        {availability.map((a) => {
          const light = a.count <= 2;
          return (
            <div key={a.carer} className="card avail">
              <div className="flex between" style={{ alignItems: "center" }}>
                <div className="portal-avatar">{a.carer.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</div>
                <span className={`pill tone-${light ? "green" : "grey"}`}>{light ? "Has capacity" : "Busy"}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 8 }}>{a.carer}</div>
              <div className="muted" style={{ fontSize: 12 }}>{a.count} call{a.count === 1 ? "" : "s"} · {fmtHours(a.mins)} booked</div>
              {a.blocks.length > 0 && (
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  {a.blocks.map((b) => b.time).join(" · ")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* full manual assignment (power view) */}
      <div className="section-title">
        <button className="linkish" onClick={() => setShowAll((s) => !s)}>
          <span className="ms" style={{ fontSize: 16 }}>{showAll ? "expand_less" : "expand_more"}</span>
          All calls &amp; manual assignment
        </button>
      </div>
      {showAll && (
        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visits.map((v) => {
              const isBusy = busy === v.key;
              const pend = pendingSet.get(v.key);
              const showPerm = permFor === v.key;
              return (
                <div key={v.key} className="rv" style={{ borderLeft: `3px solid var(--${v.unassigned ? "red" : v.tone}-fg)` }}>
                  <div className="rv-main">
                    <span className="code">{v.time}</span>
                    <div className="rv-what">
                      <strong>{v.type}</strong>
                      <Link href={`/clients/${v.clientId}`} className="muted rv-client">{v.maskedName} · {v.su} · {v.area}</Link>
                    </div>
                    <span className={`pill tone-${v.unassigned ? "red" : v.tone}`}>{v.unassigned ? "To cover" : v.statusLabel}</span>
                  </div>
                  <div className="rv-actions">
                    <label className="rv-assign">
                      <span className="ms" aria-hidden>badge</span>
                      <select value={v.unassigned ? UNASSIGNED : v.carer} disabled={isBusy} onChange={(e) => reassign(v, e.target.value)}>
                        {carerOptions(v).map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    {v.overridden && (
                      <>
                        <span className="tag-cover" title={`Base: ${v.baseCarer}`}>cover · base {v.baseCarer}</span>
                        <button className="mini" disabled={isBusy} onClick={() => revert(v)}>Revert</button>
                        {pend ? (
                          <span className="pill tone-amber">Permanent — awaiting CSM</span>
                        ) : (
                          <button className="mini primary" disabled={isBusy} onClick={() => { setPermFor(showPerm ? null : v.key); setNote(""); }}>Make permanent</button>
                        )}
                      </>
                    )}
                  </div>
                  {showPerm && (
                    <div className="perm-form">
                      <textarea placeholder="Reason for the CSM…" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                      <div className="flex" style={{ gap: 8 }}>
                        <button className="mini primary" disabled={isBusy || note.trim().length < 4} onClick={() => requestPerm(v)}>Send to CSM</button>
                        <button className="mini" onClick={() => setPermFor(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
