"use client";

import { useState, useTransition } from "react";
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

type View = "carer" | "area" | "all";

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
  const [view, setView] = useState<View>("carer");
  const [busy, setBusy] = useState<string | null>(null);
  const [permFor, setPermFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
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
    act(v.key, "/api/perm-req", {
      action: "create",
      clientId: v.clientId,
      day: v.day,
      time: v.time,
      carer: v.carer,
      note,
    });
  const decide = (id: number, approve: boolean) =>
    act(`req-${id}`, "/api/perm-req", { action: "decide", id, approve });

  const gaps = visits.filter((v) => v.unassigned);

  const groups = groupVisits(visits, view);
  const pendKey = (p: PendingReq) => `${p.clientId}|${p.day}|${p.time}`;
  const pendingSet = new Map(pending.map((p) => [pendKey(p), p]));

  const carerOptions = (v: RosterVisit) => {
    const opts = new Set<string>([UNASSIGNED, ...carerPool]);
    if (v.carer && !opts.has(v.carer)) opts.add(v.carer);
    return [...opts];
  };

  function VisitRow({ v }: { v: RosterVisit }) {
    const isBusy = busy === v.key;
    const pend = pendingSet.get(v.key);
    const showPerm = permFor === v.key;
    return (
      <div className="rv" style={{ borderLeft: `3px solid var(--${v.tone}-fg, var(--accent))` }}>
        <div className="rv-main">
          <span className="code">{v.time}</span>
          <div className="rv-what">
            <strong>{v.type}</strong>
            <Link href={`/clients/${v.clientId}`} className="muted rv-client">
              {v.maskedName} · {v.su} · {v.area} · {v.durMin}m
            </Link>
          </div>
          <span className={`pill tone-${v.unassigned ? "red" : v.tone}`}>
            {v.unassigned ? "To cover" : v.statusLabel}
          </span>
        </div>
        <div className="rv-actions">
          <label className="rv-assign">
            <span className="ms" aria-hidden>badge</span>
            <select
              value={v.unassigned ? UNASSIGNED : v.carer}
              disabled={isBusy}
              onChange={(e) => reassign(v, e.target.value)}
            >
              {carerOptions(v).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {v.overridden && (
            <>
              <span className="tag-cover" title={`Base: ${v.baseCarer}`}>
                cover · base {v.baseCarer}
              </span>
              <button className="mini" disabled={isBusy} onClick={() => revert(v)}>
                Revert
              </button>
              {pend ? (
                <span className="pill tone-amber">Permanent — awaiting CSM</span>
              ) : (
                <button
                  className="mini primary"
                  disabled={isBusy}
                  onClick={() => {
                    setPermFor(showPerm ? null : v.key);
                    setNote("");
                  }}
                >
                  Make permanent
                </button>
              )}
            </>
          )}
        </div>
        {showPerm && (
          <div className="perm-form">
            <textarea
              placeholder="Reason for the CSM (e.g. carer has covered this call for 3 weeks, client settled)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
            <div className="flex" style={{ gap: 8 }}>
              <button className="mini primary" disabled={isBusy || note.trim().length < 4} onClick={() => requestPerm(v)}>
                Send to CSM
              </button>
              <button className="mini" onClick={() => setPermFor(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
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
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {p.note} <span style={{ opacity: 0.7 }}>— {p.requestedBy}</span>
                </div>
              </div>
              <div className="flex" style={{ gap: 8 }}>
                <button className="mini primary" disabled={busy === `req-${p.id}`} onClick={() => decide(p.id, true)}>
                  Approve
                </button>
                <button className="mini" disabled={busy === `req-${p.id}`} onClick={() => decide(p.id, false)}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* gaps to cover */}
      {gaps.length > 0 && (
        <div className="card" style={{ borderLeft: "4px solid var(--red-fg)" }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            Gaps to cover · {gaps.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {gaps.map((v) => (
              <VisitRow key={v.key} v={v} />
            ))}
          </div>
        </div>
      )}

      {/* view toggle */}
      <div className="flex" style={{ gap: 8, margin: "4px 0 2px" }}>
        {(["carer", "area", "all"] as View[]).map((mode) => (
          <button key={mode} className={`chip${view === mode ? " active" : ""}`} onClick={() => setView(mode)}>
            {mode === "carer" ? "By carer" : mode === "area" ? "By area" : "All visits"}
          </button>
        ))}
      </div>

      {view === "all" ? (
        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visits.map((v) => (
              <VisitRow key={v.key} v={v} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid cols-2">
          {groups.map((g) => {
            const flag = view === "carer" && g.label === UNASSIGNED;
            return (
              <div key={g.label} className="card" style={flag ? { borderLeft: "4px solid var(--red-fg)" } : undefined}>
                <div className="flex between" style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 14.5 }}>{g.label}</strong>
                  <span className={`pill tone-${flag ? "red" : "grey"}`}>{g.visits.length} visits</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.visits.map((v) => (
                    <VisitRow key={v.key} v={v} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupVisits(visits: RosterVisit[], view: View): { label: string; visits: RosterVisit[] }[] {
  if (view === "all") return [{ label: "All", visits }];
  const map = new Map<string, RosterVisit[]>();
  for (const v of visits) {
    const label = view === "carer" ? (v.unassigned ? UNASSIGNED : v.carer) : v.area || "Unassigned area";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(v);
  }
  return [...map.entries()]
    .map(([label, vs]) => ({ label, visits: vs }))
    .sort((a, b) => {
      if (a.label === UNASSIGNED) return -1;
      if (b.label === UNASSIGNED) return 1;
      return a.label.localeCompare(b.label);
    });
}
