"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import CallCapture from "@/components/CallCapture";

export type DispatchCall = {
  clientId: string;
  su: string;
  maskedName: string;
  carer: string;
  time: string;
  startMin: number;
  durMin: number;
  type: string;
  state: string; // ecm state
  stateLabel: string;
  tone: string;
  checkinMin: number | null;
  checkoutMin: number | null;
};

export type Lane = { carer: string; calls: DispatchCall[] };

const DAY_START = 7 * 60;
const DAY_END = 21 * 60;
const SPAN = DAY_END - DAY_START;
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);
const pct = (min: number) => Math.max(0, Math.min(100, ((min - DAY_START) / SPAN) * 100));
const hm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(((min % 60) + 60) % 60).padStart(2, "0")}`;

/** Is a carer free for a [start,end) window — no booked call overlaps it? */
function laneFree(calls: DispatchCall[], startMin: number, endMin: number): boolean {
  return !calls.some((c) => startMin < c.startMin + c.durMin && endMin > c.startMin);
}

/**
 * Dispatch board — carers down the side, each call a duration bar on their row
 * coloured by live state (planned → on site → completed) with the actual
 * clock-in/out. Unassigned calls sit in a lane on top and can be dragged onto a
 * carer to allocate them (this week's cover).
 */
export default function EcmDispatch({ lanes, unassigned, weekday, nowMin, canAssign, canCapture = false }: {
  lanes: Lane[];
  unassigned: DispatchCall[];
  weekday: string;
  nowMin: number;
  canAssign: boolean;
  canCapture?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [drag, setDrag] = useState<DispatchCall | null>(null);
  const [overCarer, setOverCarer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<DispatchCall | null>(null);
  const nowShown = nowMin >= DAY_START && nowMin <= DAY_END;

  async function assign(call: DispatchCall, carer: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/cover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set", clientId: call.clientId, day: weekday, time: call.time, carer }) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); toast(j.error ?? "Could not assign", "error"); return; }
      toast(`${call.time} ${call.su} → ${carer}`);
      router.refresh();
    } finally { setBusy(false); setDrag(null); setOverCarer(null); }
  }

  function onDrop(carer: string) {
    if (drag && canAssign) assign(drag, carer);
  }

  const Block = ({ c }: { c: DispatchCall }) => {
    const left = pct(c.startMin);
    const width = Math.max(1.4, pct(c.startMin + c.durMin) - left);
    const actual = c.checkinMin != null ? `${hm(c.checkinMin)}${c.checkoutMin != null ? `→${hm(c.checkoutMin)}` : "→…"}` : "";
    return (
      <button type="button" className={`disp-block tone-bg-${c.tone}`} style={{ left: `${left}%`, width: `${width}%`, cursor: "pointer" }}
        onClick={() => setSel(c)}
        title={`${c.time} ${c.type} · ${c.su} · ${c.stateLabel}${actual ? ` · actual ${actual}` : ""} — click to check in / out`}>
        <span className="disp-block-t">{c.su}</span>
        {actual && <span className="disp-block-a">{actual}</span>}
      </button>
    );
  };

  return (
    <div className="card" style={{ padding: 0, overflowX: "auto" }}>
      <div className="disp" style={{ minWidth: 880 }}>
        {/* axis */}
        <div className="disp-row disp-axis">
          <div className="disp-label disp-axis-label">Carer</div>
          <div className="disp-track">
            {HOURS.map((h) => <span key={h} className="tl-tick" style={{ left: `${pct(h)}%` }}>{hm(h)}</span>)}
            {nowShown && <div className="tl-now" style={{ left: `${pct(nowMin)}%` }} />}
          </div>
        </div>

        {/* unassigned lane */}
        {unassigned.length > 0 && (
          <div className="disp-row disp-unassigned">
            <div className="disp-label"><span className="pill tone-red" style={{ fontSize: 10.5 }}><span className="ms" style={{ fontSize: 12 }}>drag_indicator</span>Unassigned · {unassigned.length}</span><div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{canAssign ? "Drag onto a carer" : "View only"}</div></div>
            <div className="disp-track">
              {HOURS.map((h) => <span key={h} className="tl-grid" style={{ left: `${pct(h)}%` }} />)}
              {unassigned.map((c) => {
                const left = pct(c.startMin);
                const width = Math.max(1.4, pct(c.startMin + c.durMin) - left);
                return (
                  <div key={`${c.clientId}|${c.time}`} className="disp-block disp-gap" draggable={canAssign}
                    onDragStart={() => setDrag(c)} onDragEnd={() => { setDrag(null); setOverCarer(null); }}
                    style={{ left: `${left}%`, width: `${width}%` }} title={`${c.time} ${c.type} · ${c.su} — drag onto a carer`}>
                    <span className="disp-block-t">{c.su}</span>
                  </div>
                );
              })}
              {nowShown && <div className="tl-now" style={{ left: `${pct(nowMin)}%` }} />}
            </div>
          </div>
        )}

        {/* carer lanes */}
        {lanes.map((ln) => {
          const dStart = drag?.startMin ?? 0;
          const dEnd = drag ? drag.startMin + drag.durMin : 0;
          const free = drag ? laneFree(ln.calls, dStart, dEnd) : false;
          return (
            <div key={ln.carer} className={`disp-row${overCarer === ln.carer ? " disp-over" : ""}${drag ? (free ? " disp-freelane" : " disp-busylane") : ""}`}
              onDragOver={(e) => { if (drag && canAssign) { e.preventDefault(); setOverCarer(ln.carer); } }}
              onDragLeave={() => setOverCarer((c) => (c === ln.carer ? null : c))}
              onDrop={() => onDrop(ln.carer)}>
              <div className="disp-label">
                <strong style={{ fontSize: 12.5 }}>{ln.carer}</strong>
                <div className="muted" style={{ fontSize: 10.5 }}>{drag ? (free ? "✓ free at this time" : "busy at this time") : `${ln.calls.length} call${ln.calls.length === 1 ? "" : "s"}`}</div>
              </div>
              <div className="disp-track">
                {HOURS.map((h) => <span key={h} className="tl-grid" style={{ left: `${pct(h)}%` }} />)}
                {ln.calls.map((c) => <Block key={`${c.clientId}|${c.time}`} c={c} />)}
                {drag && <div className={`disp-ghost ${free ? "ok" : "bad"}`} style={{ left: `${pct(dStart)}%`, width: `${Math.max(1.4, pct(dEnd) - pct(dStart))}%` }} />}
                {nowShown && <div className="tl-now" style={{ left: `${pct(nowMin)}%` }} />}
              </div>
            </div>
          );
        })}
      </div>

      {sel && (
        <div className="disp-panel">
          <div className="flex between wrap" style={{ gap: 10, alignItems: "center" }}>
            <div>
              <div className="flex" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="code">{sel.time}</span>
                <strong style={{ fontSize: 13 }}>{sel.type}</strong>
                <span className={`pill tone-${sel.tone}`} style={{ fontSize: 10.5 }}>{sel.stateLabel}</span>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                <Link href={`/clients/${sel.clientId}?tab=schedule`} style={{ fontWeight: 600 }}>{sel.maskedName}</Link>
                <span className="code" style={{ marginLeft: 5 }}>{sel.su}</span> · {sel.carer || "Unassigned"}
                {sel.checkinMin != null && <> · in {hm(sel.checkinMin)}{sel.checkoutMin != null ? ` · out ${hm(sel.checkoutMin)}` : " · on site"}</>}
              </div>
            </div>
            <div className="flex" style={{ gap: 8, alignItems: "center" }}>
              {canCapture ? <CallCapture clientId={sel.clientId} time={sel.time} carer={sel.carer} state={sel.state} /> : <span className="muted" style={{ fontSize: 12 }}>View only</span>}
              <button className="mini" onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {busy && <div className="muted" style={{ fontSize: 11.5, padding: "6px 12px" }}>Assigning…</div>}
      <div className="flex wrap" style={{ gap: 14, padding: "8px 12px", fontSize: 11, borderTop: "1px solid var(--line)" }}>
        <span className="flex" style={{ gap: 5, alignItems: "center" }}><span className="disp-key tone-bg-grey" />Planned</span>
        <span className="flex" style={{ gap: 5, alignItems: "center" }}><span className="disp-key tone-bg-blue" />Due</span>
        <span className="flex" style={{ gap: 5, alignItems: "center" }}><span className="disp-key tone-bg-green" />On site</span>
        <span className="flex" style={{ gap: 5, alignItems: "center" }}><span className="disp-key tone-bg-teal" />Completed</span>
        <span className="flex" style={{ gap: 5, alignItems: "center" }}><span className="disp-key tone-bg-red" />Missed / late</span>
      </div>
    </div>
  );
}
