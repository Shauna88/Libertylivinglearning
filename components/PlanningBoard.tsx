"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type PlanCandidate = { name: string; freeHours: number; areaFit: "home" | "radius" };
export type PlanRisk = { carer: string; kind: "leave" | "sick"; label: string };
export type PlanCall = {
  key: string;
  clientId: string;
  su: string;
  maskedName: string;
  area: string;
  day: string;
  time: string;
  dur: string;
  durMin: number;
  startMin: number;
  type: string;
  risk?: PlanRisk; // set when the assigned carer is off this week (cover needed)
};
export type PlanOff = { kind: "leave" | "sick"; label: string; days: string[] };
export type PlanCarer = {
  id: string;
  name: string;
  homeArea: string;
  covers: string[];
  capacityHours: number;
  committedHours: number;
  spareHours: number;
  workDays: string[];
  callsThisWeek: number;
  off?: PlanOff; // approved time-off / sickness landing in this week
};
export type PlanShortage = { name: string; kind: "leave" | "sick"; label: string }[];

function hm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export default function PlanningBoard({
  area,
  areas,
  demand,
  carers,
  candidatesByCall,
  shortage,
  isCsm,
}: {
  area: string;
  areas: string[];
  demand: PlanCall[];
  carers: PlanCarer[];
  candidatesByCall: Record<string, PlanCandidate[]>;
  shortage: PlanShortage;
  isCsm: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const atRiskCount = useMemo(() => demand.filter((c) => c.risk).length, [demand]);
  const byKey = useMemo(() => new Map(demand.map((c) => [c.key, c])), [demand]);
  const demandByDay = useMemo(() => {
    const m = new Map<string, PlanCall[]>();
    for (const c of demand) {
      if (!m.has(c.day)) m.set(c.day, []);
      m.get(c.day)!.push(c);
    }
    for (const list of m.values()) list.sort((a, b) => a.startMin - b.startMin);
    return m;
  }, [demand]);

  // Selected calls (a would-be "run") must share a day and not overlap each other.
  const selectedCalls = useMemo(
    () => [...selected].map((k) => byKey.get(k)).filter(Boolean) as PlanCall[],
    [selected, byKey]
  );
  const selectionDay = selectedCalls[0]?.day ?? null;

  // Carers who can cover EVERY selected call: the intersection of each call's
  // candidate list (each candidate is already area-matched, available, clash-free).
  const runCandidates = useMemo<PlanCandidate[]>(() => {
    if (selectedCalls.length === 0) return [];
    const lists = selectedCalls.map((c) => candidatesByCall[c.key] ?? []);
    const [first, ...rest] = lists;
    const names = new Map(first.map((c) => [c.name, c]));
    for (const l of rest) {
      const set = new Set(l.map((c) => c.name));
      for (const n of [...names.keys()]) if (!set.has(n)) names.delete(n);
    }
    return [...names.values()].sort((a, b) => b.freeHours - a.freeHours);
  }, [selectedCalls, candidatesByCall]);

  const totalSelMin = selectedCalls.reduce((n, c) => n + c.durMin, 0);

  function toggle(call: PlanCall) {
    setErr("");
    setOkMsg("");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(call.key)) {
        next.delete(call.key);
        return next;
      }
      // Starting a fresh selection on a different day resets it (a run is one day).
      if (selectionDay && call.day !== selectionDay) return new Set([call.key]);
      // No overlap with an already-selected call.
      const clash = [...next].some((k) => {
        const other = byKey.get(k);
        if (!other) return false;
        return call.startMin < other.startMin + other.durMin && call.startMin + call.durMin > other.startMin;
      });
      if (clash) {
        setErr("That call overlaps one you've already selected — a run can't double-book a carer.");
        return next;
      }
      next.add(call.key);
      return next;
    });
  }

  async function assign(carerName: string, permanent: boolean) {
    if (selectedCalls.length === 0) return;
    setBusy(true);
    setErr("");
    setOkMsg("");
    try {
      for (const call of selectedCalls) {
        const url = permanent
          ? isCsm
            ? `/api/clients/${call.clientId}`
            : "/api/perm-req"
          : "/api/cover";
        const body = permanent
          ? isCsm
            ? { action: "set_schedule_carer", day: call.day, time: call.time, carer: carerName }
            : { action: "create", clientId: call.clientId, day: call.day, time: call.time, carer: carerName, note: `Roster planner — assign ${carerName}` }
          : { action: "set", clientId: call.clientId, day: call.day, time: call.time, carer: carerName };
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Assignment failed.");
        }
      }
      const n = selectedCalls.length;
      const verb = permanent ? (isCsm ? "assigned permanently" : "sent to the CSM") : "covered this week";
      setOkMsg(`${carerName} — ${n} call${n === 1 ? "" : "s"} ${verb}.`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const setArea = (a: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", "planner");
    params.set("area", a);
    router.push(`/roster?${params.toString()}`);
  };

  const uncovered = demand.length;

  return (
    <div className="body fade">
      {/* controls */}
      <div className="flex between wrap" style={{ gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div className="flex wrap" style={{ gap: 6, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>Area</span>
          <div className="seg" role="group" aria-label="Area">
            {areas.map((a) => (
              <button key={a} aria-pressed={a === area} className={`seg-btn${a === area ? " active" : ""}`} onClick={() => setArea(a)}>{a}</button>
            ))}
          </div>
        </div>
        <span className={`pill ${uncovered > 0 ? "tone-red" : "tone-green"}`}>
          <span className="ms" style={{ fontSize: 14 }}>{uncovered > 0 ? "event_busy" : "task_alt"}</span>
          {uncovered > 0 ? `${uncovered} uncovered call${uncovered === 1 ? "" : "s"} this week` : "Every call covered"}
        </span>
      </div>

      {shortage.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderColor: "var(--amber-fg)", background: "var(--amber-bg)", padding: "10px 13px" }}>
          <div className="flex" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
            <span className="ms" style={{ fontSize: 18, color: "var(--amber-fg)" }}>event_busy</span>
            <strong>{shortage.length} carer{shortage.length === 1 ? "" : "s"} off in {area} this week</strong>
            <span className="muted">
              — {shortage.map((s) => `${s.name} (${s.kind === "sick" ? "sick" : "leave"})`).join(", ")}.
              {atRiskCount > 0 && ` ${atRiskCount} of their call${atRiskCount === 1 ? "" : "s"} need cover below.`}
            </span>
          </div>
        </div>
      )}
      {err && <div className="card" style={{ borderColor: "var(--red-fg)", color: "var(--red-fg)", marginBottom: 12 }}>{err}</div>}
      {okMsg && <div className="pill tone-green" style={{ marginBottom: 12 }}><span className="ms" style={{ fontSize: 14 }}>check_circle</span>{okMsg}</div>}

      <div className="plan-grid">
        {/* DEMAND */}
        <div>
          <div className="section-title" style={{ marginTop: 0 }}>
            Unassigned calls in {area}
            <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}> · tick calls in one day to cover them as a run</span>
          </div>
          {uncovered === 0 ? (
            <div className="empty"><span className="ms empty-icon" aria-hidden="true">task_alt</span><div className="empty-title">Nothing to cover in {area}</div><div className="empty-hint">Every call in this area and its neighbours has a carer.</div></div>
          ) : (
            WEEK.filter((d) => demandByDay.has(d)).map((day) => (
              <div key={day} className="card" style={{ marginBottom: 12, padding: "12px 14px" }}>
                <div className="flex between" style={{ alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13.5 }}>{day}</strong>
                  <span className="muted" style={{ fontSize: 11.5 }}>{demandByDay.get(day)!.length} to cover</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {demandByDay.get(day)!.map((c) => {
                    const on = selected.has(c.key);
                    const cands = candidatesByCall[c.key] ?? [];
                    return (
                      <button key={c.key} className={`plan-call${on ? " on" : ""}`} onClick={() => toggle(c)} aria-pressed={on}>
                        <span className="ms" style={{ fontSize: 16 }}>{on ? "check_box" : "check_box_outline_blank"}</span>
                        <span className="code" style={{ minWidth: 46 }}>{c.time}</span>
                        <span style={{ fontWeight: 600, flex: "1 1 auto", textAlign: "left", minWidth: 0 }}>
                          {c.type} · {c.su}
                          {c.risk && (
                            <span className={`pill ${c.risk.kind === "sick" ? "tone-red" : "tone-amber"}`} style={{ fontSize: 10, marginLeft: 6 }}>
                              <span className="ms" style={{ fontSize: 12 }}>{c.risk.kind === "sick" ? "sick" : "flight_takeoff"}</span>
                              {c.risk.carer.split(" ")[0]} {c.risk.kind === "sick" ? "sick" : "on leave"}
                            </span>
                          )}
                        </span>
                        <span className="muted" style={{ fontSize: 11.5 }}>{c.dur}</span>
                        <span className={`pill ${cands.length ? "tone-green" : "tone-red"}`} style={{ fontSize: 10.5 }}>
                          {cands.length ? `${cands.length} can cover` : "none free"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* SUPPLY / assign */}
        <div>
          {selectedCalls.length > 0 ? (
            <div className="card" style={{ position: "sticky", top: 12 }}>
              <div className="flex between" style={{ alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 14 }}>Cover {selectedCalls.length} call{selectedCalls.length === 1 ? "" : "s"}</strong>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{selectionDay} · {hm(totalSelMin)} · {area}</div>
                </div>
                <button className="mini" onClick={() => setSelected(new Set())}>Clear</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {selectedCalls.sort((a, b) => a.startMin - b.startMin).map((c) => (
                  <div key={c.key} className="muted" style={{ fontSize: 11.5 }}>
                    <span className="code">{c.time}</span> {c.type} · {c.su} <span style={{ opacity: 0.7 }}>({c.dur})</span>
                  </div>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
                {runCandidates.length ? "Available & nearby — ranked by spare hours" : "No one can take the whole run"}
              </div>
              {runCandidates.length === 0 ? (
                <div className="muted" style={{ fontSize: 12.5 }}>
                  No active carer covers {area}, is free at {selectedCalls.length > 1 ? "all these times" : "this time"} and within their availability. Try covering the calls individually, widen a carer&apos;s availability, or use the on-call HCA.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {runCandidates.map((c) => (
                    <div key={c.name} className="plan-cand">
                      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {c.areaFit === "home" ? `Based in ${area}` : `Covers ${area}`} · {c.freeHours}h spare
                        </div>
                      </div>
                      <div className="flex" style={{ gap: 6 }}>
                        <button className="mini primary" disabled={busy} onClick={() => assign(c.name, false)}>{busy ? "…" : "This week"}</button>
                        <button className="mini" disabled={busy} onClick={() => assign(c.name, true)}>{isCsm ? "Permanent" : "Request"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Carers covering {area}</div>
              {carers.length === 0 ? (
                <div className="muted" style={{ fontSize: 12.5 }}>No active carers cover this area.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {carers.map((c) => (
                    <div key={c.id} className={`plan-supply${c.off ? " away" : ""}`}>
                      <div className="flex between" style={{ alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>{c.homeArea}{c.homeArea === area ? " (home)" : ` → ${area}`} · {c.callsThisWeek} call{c.callsThisWeek === 1 ? "" : "s"}</div>
                        </div>
                        {c.off ? (
                          <span className={`pill ${c.off.kind === "sick" ? "tone-red" : "tone-amber"}`} style={{ fontSize: 10.5 }}>
                            <span className="ms" style={{ fontSize: 12 }}>{c.off.kind === "sick" ? "sick" : "flight_takeoff"}</span>
                            {c.off.kind === "sick" ? "Off sick" : "On leave"}
                          </span>
                        ) : (
                          <span className={`pill ${c.spareHours <= 0 ? "tone-grey" : c.spareHours < 4 ? "tone-amber" : "tone-green"}`} style={{ fontSize: 10.5 }}>
                            {c.spareHours}h spare
                          </span>
                        )}
                      </div>
                      <div className="plan-days" aria-hidden="true">
                        {WEEK.map((d) => {
                          const offDay = c.off?.days.includes(d);
                          const on = c.workDays.includes(d) && !offDay;
                          return (
                            <span key={d} className={`plan-day${on ? " on" : ""}${offDay ? " away" : ""}`} title={`${d}: ${offDay ? c.off!.label : c.workDays.includes(d) ? "available" : "off"}`}>{d[0]}</span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
                Tick one or more unassigned calls to see who can cover them.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
