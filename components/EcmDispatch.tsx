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
  time: string; // effective (adjusted) start time — for display
  baseTime: string; // scheduled time — the identity key for API calls
  timeAdjusted: boolean;
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

/** Offer status per slot (`clientId|day|time`) so the board shows acceptance. */
export type OfferInfo = { carer: string; status: string };

const OFFER_META: Record<string, { label: string; tone: string; icon: string }> = {
  pending: { label: "Awaiting acceptance", tone: "amber", icon: "hourglass_top" },
  accepted: { label: "Accepted by HCA", tone: "green", icon: "check_circle" },
  declined: { label: "Declined — re-cover", tone: "red", icon: "cancel" },
};

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
export default function EcmDispatch({ lanes, unassigned, weekday, nowMin, canAssign, canCapture = false, carers = [], offers = {} }: {
  lanes: Lane[];
  unassigned: DispatchCall[];
  weekday: string;
  nowMin: number;
  canAssign: boolean;
  canCapture?: boolean;
  carers?: string[];
  offers?: Record<string, OfferInfo>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [drag, setDrag] = useState<DispatchCall | null>(null);
  const [overCarer, setOverCarer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<DispatchCall | null>(null);
  const [reCarer, setReCarer] = useState("");
  const [reReason, setReReason] = useState("");
  const [reTime, setReTime] = useState("");
  const nowShown = nowMin >= DAY_START && nowMin <= DAY_END;
  const offerFor = (c: DispatchCall) => offers[`${c.clientId}|${weekday}|${c.baseTime}`];

  // Assign / reassign / unassign — a last-minute change pushes the shift to the
  // HCA to accept and posts a notice to the family portal (push: true).
  async function change(call: DispatchCall, carer: string, reason?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/cover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set", clientId: call.clientId, day: weekday, time: call.baseTime, carer, reason, push: true }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast(j.error ?? "Could not update", "error"); return; }
      toast(/^unassigned$/i.test(carer) ? `${call.time} ${call.su} unassigned` : `${call.time} ${call.su} → ${carer}${j.offered ? " · shift offered" : ""}`);
      setSel(null); setReCarer(""); setReReason(""); setReTime("");
      router.refresh();
    } finally { setBusy(false); setDrag(null); setOverCarer(null); }
  }

  // Temporary time tweak (that day only) — pushes to the carer + family portal.
  async function moveTime(call: DispatchCall, newTime: string, clear = false) {
    setBusy(true);
    try {
      const body = clear
        ? { action: "clear", clientId: call.clientId, day: weekday, time: call.baseTime, push: true }
        : { action: "set", clientId: call.clientId, day: weekday, time: call.baseTime, newTime, push: true };
      const res = await fetch("/api/time-override", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast(j.error ?? "Could not move the time", "error"); return; }
      toast(clear ? `${call.su} time reset` : `${call.su} moved to ${newTime}${j.offered ? " · shift offered" : ""}`);
      setSel(null); setReTime("");
      router.refresh();
    } finally { setBusy(false); }
  }

  function onDrop(carer: string) {
    if (drag && canAssign) change(drag, carer);
  }

  const Block = ({ c }: { c: DispatchCall }) => {
    const left = pct(c.startMin);
    const width = Math.max(1.4, pct(c.startMin + c.durMin) - left);
    const actual = c.checkinMin != null ? `${hm(c.checkinMin)}${c.checkoutMin != null ? `→${hm(c.checkoutMin)}` : "→…"}` : "";
    const offer = offerFor(c);
    const om = offer ? OFFER_META[offer.status] : undefined;
    return (
      <button type="button" className={`disp-block tone-bg-${c.tone}${offer ? ` disp-offer-${offer.status}` : ""}`} style={{ left: `${left}%`, width: `${width}%`, cursor: "pointer" }}
        onClick={() => { setReCarer(""); setReReason(""); setReTime(""); setSel(c); }}
        title={`${c.time} ${c.type} · ${c.su} · ${c.stateLabel}${actual ? ` · actual ${actual}` : ""}${om ? ` · ${om.label}` : ""} — click to check in / out`}>
        <span className="disp-block-t">{c.su}</span>
        {om && <span className={`disp-offer-dot tone-bg-${om.tone}`} aria-hidden="true" />}
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

        {/* unassigned lane — always shown so the drag target is clear */}
        <div className={`disp-row disp-unassigned${unassigned.length === 0 ? " disp-unassigned-empty" : ""}`}>
          <div className="disp-label">
            {unassigned.length > 0
              ? <><span className="pill tone-red" style={{ fontSize: 10.5 }}><span className="ms" style={{ fontSize: 12 }}>drag_indicator</span>Unassigned · {unassigned.length}</span><div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{canAssign ? "Drag onto a carer" : "View only"}</div></>
              : <><span className="pill tone-green" style={{ fontSize: 10.5 }}><span className="ms" style={{ fontSize: 12 }}>check</span>Unassigned · 0</span><div className="muted" style={{ fontSize: 10, marginTop: 2 }}>All calls allocated</div></>}
          </div>
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
            {unassigned.length === 0 && <span className="muted" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11 }}>No unassigned calls right now — reassigned or new gaps appear here to drag onto a carer.</span>}
            {nowShown && <div className="tl-now" style={{ left: `${pct(nowMin)}%` }} />}
          </div>
        </div>

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
              {canCapture ? <CallCapture clientId={sel.clientId} time={sel.baseTime} carer={sel.carer} state={sel.state} /> : <span className="muted" style={{ fontSize: 12 }}>View only</span>}
              <button className="mini" onClick={() => { setSel(null); setReCarer(""); setReReason(""); setReTime(""); }}>Close</button>
            </div>
          </div>

          {(() => { const om = OFFER_META[offerFor(sel)?.status ?? ""]; return om ? (
            <div className="flex" style={{ gap: 6, alignItems: "center", marginTop: 8, fontSize: 12 }}>
              <span className={`pill tone-${om.tone}`} style={{ fontSize: 10.5 }}><span className="ms" style={{ fontSize: 12 }}>{om.icon}</span>{om.label}</span>
              <span className="muted">{offerFor(sel)!.carer}</span>
            </div>
          ) : null; })()}

          {canAssign && (
            <div className="disp-reassign">
              <div className="muted" style={{ fontSize: 11, marginBottom: 5 }}>
                <span className="ms" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 3 }}>bolt</span>
                Last-minute change (today only) — the HCA is asked to accept and the family is notified.
              </div>
              <div className="flex wrap" style={{ gap: 8, alignItems: "center" }}>
                <select className="input" style={{ fontSize: 12.5, padding: "6px 9px", flex: "1 1 180px" }} value={reCarer} onChange={(e) => setReCarer(e.target.value)}>
                  <option value="">Reassign to…</option>
                  {carers.filter((c) => c !== sel.carer).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className="mini primary" disabled={busy || !reCarer} onClick={() => change(sel, reCarer)}>
                  {busy ? "…" : "Reassign & push"}
                </button>
              </div>
              <div className="flex wrap" style={{ gap: 8, alignItems: "center", marginTop: 8 }}>
                <input className="input" style={{ fontSize: 12.5, padding: "6px 9px", flex: "1 1 180px" }} placeholder="Reason to unassign…" value={reReason} onChange={(e) => setReReason(e.target.value)} />
                <button className="mini" disabled={busy || reReason.trim().length < 3} onClick={() => change(sel, "Unassigned", reReason.trim())}>
                  <span className="ms" style={{ fontSize: 14, marginRight: 3 }}>person_remove</span>Unassign
                </button>
              </div>
              <div className="flex wrap" style={{ gap: 8, alignItems: "center", marginTop: 8 }}>
                <span className="muted" style={{ fontSize: 11.5, display: "flex", alignItems: "center", gap: 3 }}>
                  <span className="ms" style={{ fontSize: 14 }}>schedule</span>
                  {sel.timeAdjusted ? <>Moved to {sel.time} (usual {sel.baseTime})</> : <>Nudge time (scheduled {sel.baseTime})</>}
                </span>
                <input className="input" type="time" style={{ fontSize: 12.5, padding: "6px 9px" }} value={reTime || sel.time} onChange={(e) => setReTime(e.target.value)} />
                <button className="mini primary" disabled={busy || (reTime || sel.time) === sel.baseTime} onClick={() => moveTime(sel, reTime || sel.time)}>Move time</button>
                {sel.timeAdjusted && <button className="mini" disabled={busy} onClick={() => moveTime(sel, "", true)}>Reset</button>}
              </div>
            </div>
          )}
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
